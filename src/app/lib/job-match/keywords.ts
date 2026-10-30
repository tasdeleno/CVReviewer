import { foldText } from "lib/fold-text";
import {
  findConditionSpans,
  toConditions,
  withoutConditions,
  type ConditionKind,
} from "lib/job-match/conditions";
import {
  SKILLS,
  getSkillLabel,
  type SkillEntry,
} from "lib/job-match/dictionary";
import { extractPhrases } from "lib/job-match/phrases";
import {
  detectLang,
  findPhraseSpan,
  hasPhrase,
  rawTokenize,
  toPhrase,
  tokenize,
  toTokenizedText,
  type Phrase,
  type TokenizedText,
} from "lib/job-match/text";

export type Importance = "required" | "normal" | "preferred";

export interface AdKeyword {
  // dictionary skill, tool-like token, or domain phrase outside the dictionary
  kind: "dict" | "token" | "phrase";
  label: string; // dictionary label, or the token/phrase as written in the ad
  skill?: SkillEntry; // undefined for keywords found outside the dictionary
  phrases: Phrase[];
  importance: Importance;
  weight: number;
  context: string; // the ad line it came from, used for suggestions
  alternatives?: boolean; // several fields of study, any of which satisfies it
}

type Block = "required" | "preferred" | "responsibilities" | "intro" | "skip";

// Heading patterns in folded form. Order matters: preferred before required, since
// "preferred qualifications" contains "qualification".
// prettier-ignore
const HEADING_PATTERNS: [Block, string[]][] = [
  ["preferred", ["nice to have", "nice-to-have", "preferred", "bonus", "tercih", "arti olarak", "artilar", "avantaj"]],
  ["required", ["requirement", "qualification", "what you bring", "what you'll bring", "what you need", "you have",
    "must have", "looking for", "about you", "your profile", "skills", "nitelik", "gereksinim", "beklenti",
    "aradigimiz", "aranan", "yetkinlik", "sart"]],
  ["responsibilities", ["responsibilit", "what you'll do", "what you will do", "duties", "the role", "your role",
    "sorumluluk", "gorev", "is tanimi", "neler yapacaksin", "neler yapacaksiniz",
    "job description", "role description", "position description", "position summary", "pozisyon tanimi"]],
  ["skip", ["benefit", "we offer", "perks", "about us", "who we are", "why join", "sunduklarimiz", "neler sunuyoruz",
    "hakkimizda", "yan haklar", "biz kimiz", "olanaklar", "imkanlar", "you will receive", "you'll receive",
    "additional information", "compensation", "sunuyoruz"]],
];

// Inline markers that make a sentence "preferred" or "required" regardless of its block
// prettier-ignore
const INLINE_PREFERRED = ["is a plus", "a plus", "big plus", "strong plus", "nice to have", "preferred", "is an advantage", "bonus",
  "tercih sebebi", "arti olarak", "avantaj"];
// Adverbs make only their own item preferred ("an ERP, ideally SAP"), or the whole
// sentence they open ("Tercihen Python, SQL bilgisi")
// prettier-ignore
const PREFERRED_ADVERBS = ["ideally", "preferably", "if possible", "tercihen", "ideal olarak", "mumkunse"];
// Words whose dot does not end a sentence ("(ör. HubSpot)", "e.g. Python"), folded, with
// their inner dots. "etc." usually ends a sentence, so it is not here.
// prettier-ignore
const ABBREVIATIONS = new Set(["vb", "vs", "or", "orn", "bkz", "e.g", "i.e", "inc", "ltd", "a.s", "yrs", "approx"]);
// An intro sentence describing the employer ("Stackwell is a Series B SaaS company"), in
// toWords form; a sentence about the candidate ("You are a business analyst") is not one
// prettier-ignore
const COMPANY_INTRO = / (?:is|we are) an? (?:\S+ ){0,4}(?:company|startup|scaleup|firm|provider|agency|manufacturer|bank|retailer|consultancy) | (?:firmamiz|sirketimiz|kurulusumuz) /;
const ABOUT_CANDIDATE = / (?:you|your|candidate|candidates|aday\S*|sen|siz) /;
// prettier-ignore
const INLINE_REQUIRED = ["must have", "required", "is a must", "zorunlu", "mutlaka", "sart"];

// Sentences an employer adds to every ad: equal opportunity, privacy, hiring procedure,
// pay and benefits. They often follow the requirements without a heading, so they are
// blanked sentence by sentence wherever they stand. Narrow on purpose: bare "privacy",
// "benefits" or "KVKK" are real requirements in DPO, payroll and HR ads.
// prettier-ignore
const BOILERPLATE = ["equal opportunit", "affirmative action", "eeo", "regardless of race", "regardless of age",
  "regardless of gender", "regardless of sex", "without regard to race", "without regard to age",
  "without regard to sex", "discrimination", "discriminate", "discriminatory", "reasonable accommodation", "accommodation needs", "accommodations for applicants",
  "our privacy", "recruitment privacy", "e verify", "employment eligibility", "third party job boards",
  "automated tools", "during the recruiting process", "during the recruitment process", "talent acquisition team",
  "our recruiters", "we thank all", "only those selected", "only those individuals selected", "stock purchase",
  "equity compensation", "equity package", "401 k", "paid time off", "parental leave", "bereavement",
  "dental and vision", "medical dental", "commuter benefits", "tuition reimbursement", "profit sharing",
  "pay transparency", "registered trademark", "applicants with disabilities",
  "disabilities act", "recruitment and selection process", "as part of the hiring process", "condition of employment",
  "immunization polic", "vaccination polic", "hiring guidelines", "hires new team members", "kisisel verileriniz",
  "aydinlatma metni", "kvkk kapsaminda", "ozel saglik sigortasi", "yemek karti", "servis imkani",
  // pay and leave sentences outside a benefits heading ("We offer relocation support, 27 days annual leave")
  "we offer", "annual leave", "days holiday", "bank holidays", "stock options", "private healthcare",
  "company discounts", "personel yemegi"];
// Not length-preserving (splitOutsideParens drops blank parts and, with unbalanced
// parentheses, all parentheses); importanceParts does the same, so nothing reads offsets
const withoutBoilerplate = (content: string) =>
  splitOutsideParens(content, endsSentence)
    .map((s) => (hasMarker(toWords(s), BOILERPLATE) ? " ".repeat(s.length) : s))
    .join("");

// From the user's pairwise judgments (eval/README.md, Faz D): one missing requirement
// outweighs four missing pluses and about three missing duty skills; a duty skill
// outweighs two pluses. Fitted to those 7 answers, so recheck in the real-ad trial.
const WEIGHTS: Record<Importance, number> = {
  required: 3,
  normal: 1,
  preferred: 0.25,
};
// With fewer distinct hard skills than this the score is noise: one soft skill made an HR
// resume score 100 on a cook ad. Dev ads sit at 0–2 or 4+ (tur 3), so 3 leaves a margin.
export const MIN_AD_SKILLS = 3;
// Phrases don't count: an ad with no known skill yields plenty of them
export const isInsufficient = (keywords: AdKeyword[]) =>
  keywords.filter((k) => k.kind !== "phrase" && k.skill?.category !== "soft")
    .length < MIN_AD_SKILLS;

// Keywords found outside the dictionary are less certain to be real skills
const UNKNOWN_WEIGHT_FACTOR = 0.7;
// Phrases even less: some are only the ad's wording ("accurate records")
const PHRASE_WEIGHT_FACTOR = 0.5;
const MAX_PHRASES = 60;
const PHRASE_BLOCKS: Block[] = ["required", "preferred", "responsibilities"];
// Prose longer than this in an asked-for block is about the employer or the team
const MAX_PHRASE_LINE_WORDS = 25;
const BULLET = /^\s*(?:[-*•–·▪●◦]|\d+[.)])/;
// prettier-ignore
const EDUCATION_MARKERS = ["graduate", "degree", "bachelor", "bsc", "msc", "university", "diploma", "mezun",
  "bolum", "fakulte", "universite", "lisans", "yuksekokul"];
// ATS screening is driven by hard skills; two soft skills don't make up for one
// missing technical requirement
const SOFT_WEIGHT_FACTOR = 0.25;

// Folded words separated by single spaces, padded so " pattern" means "at a word start"
const toWords = (text: string) =>
  ` ${foldText(text)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;
const hasMarker = (words: string, markers: string[]) =>
  markers.some((marker) => words.includes(` ${toWords(marker).trim()}`));

const containsSkill = (text: string) => {
  const tokenized = toTokenizedText(text);
  return SKILLS.some((skill) =>
    skill.phrases.some((phrase) => hasPhrase(tokenized, phrase))
  );
};

/**
 * A heading is a short line ("Requirements", "Aranan Nitelikler") or a "Heading: content"
 * line whose title matches a heading pattern and names no skill ("Strong SQL skills" is
 * content, not a heading). Returns the block and the content after the colon, if any.
 */
const parseHeading = (line: string) => {
  const colon = line.match(/^[\s#*•\-–]*([^:]{2,60}):\s*(.*)$/);
  const title = colon ? colon[1] : line.trim().replace(/[.:]$/, "");
  if (!colon && /[,.;?!]/.test(title)) return undefined;
  if (title.trim().split(/\s+/).length > 6 || containsSkill(title)) {
    return undefined;
  }
  const words = toWords(title);
  const match = HEADING_PATTERNS.find(([, patterns]) =>
    hasMarker(words, patterns)
  );
  return match
    ? { block: match[0], content: colon ? colon[2] : "" }
    : undefined;
};

const getImportance = (line: string, block: Block): Importance => {
  const words = toWords(line);
  const preferred = hasMarker(words, INLINE_PREFERRED);
  const required = hasMarker(words, INLINE_REQUIRED);
  // "Python required, Java preferred": can't tell which skill is which
  if (preferred && required) return "normal";
  if (preferred) return "preferred";
  if (required) return "required";
  if (block === "required") return "required";
  if (block === "preferred") return "preferred";
  return "normal";
};

/** Splits text after each break character that sits outside parentheses */
const splitOutsideParens = (
  text: string,
  isBreak: (text: string, i: number) => boolean
): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && isBreak(text, i)) {
      parts.push(text.slice(start, i + 1));
      start = i + 1;
    }
  }
  // An unclosed "(" would swallow the rest of the line: split again ignoring parentheses
  if (depth > 0) return splitOutsideParens(text.replace(/[()]/g, " "), isBreak);
  parts.push(text.slice(start));
  return parts.filter((part) => part.trim());
};
const endsSentence = (text: string, i: number) =>
  /[.!?]/.test(text[i]) &&
  (i + 1 === text.length || /\s/.test(text[i + 1])) &&
  !ABBREVIATIONS.has(foldText(text.slice(text.lastIndexOf(" ", i) + 1, i)));
const endsItem = (text: string, i: number) =>
  text[i] === "," || text[i] === ";";

interface ImportancePart {
  text: TokenizedText;
  importance: Importance;
  companyIntro: boolean;
}
/**
 * The importance of each part of a line: predicate markers reach their sentence, adverbs
 * their item (a parenthesis holding the adverb is an item of its own).
 */
const importanceParts = (content: string, block: Block): ImportancePart[] =>
  splitOutsideParens(content, endsSentence).flatMap((sentence) => {
    const words = toWords(sentence);
    const companyIntro =
      block === "intro" &&
      COMPANY_INTRO.test(words) &&
      !ABOUT_CANDIDATE.test(words);
    const part = (text: string, importance: Importance) => ({
      text: toTokenizedText(text),
      importance,
      companyIntro,
    });
    // "Ideally you know Python, but SQL is a must": the item level sorts it out
    if (
      PREFERRED_ADVERBS.some((a) =>
        words.startsWith(` ${toWords(a).trim()} `)
      ) &&
      !hasMarker(words, INLINE_REQUIRED)
    ) {
      return [part(sentence, "preferred")];
    }
    const base = getImportance(sentence, block);
    const hasAdverb = (text: string) =>
      hasMarker(toWords(text), PREFERRED_ADVERBS);
    return splitOutsideParens(sentence, endsItem).flatMap((item) => {
      const groups = (item.match(/\([^()]*\)/g) ?? []).filter(hasAdverb);
      const rest = groups.reduce(
        (text, group) => text.replace(group, " "),
        item
      );
      return [rest, ...groups].map((text) =>
        part(text, hasAdverb(text) ? "preferred" : base)
      );
    });
  });

const mentions = (parts: ImportancePart[], phrases: Phrase[]) =>
  parts.filter((p) => phrases.some((phrase) => hasPhrase(p.text, phrase)));

/** Importance of a keyword from the parts that mention it; the strongest wins */
const importanceIn = (parts: ImportancePart[], phrases: Phrase[]) => {
  const hits = mentions(parts, phrases);
  // A phrase split across parts ("machine, learning") falls back to the whole line
  const ranked = hits.length ? hits : parts;
  return ranked
    .map((p) => p.importance)
    .reduce<Importance>(
      (a, b) => (IMPORTANCE_RANK[b] > IMPORTANCE_RANK[a] ? b : a),
      ranked.length ? "preferred" : "normal"
    );
};

// Acronyms, CamelCase and symbol tokens ("AWS", "PowerBI", "C#") look like tool names
const looksLikeTechToken = (token: string) =>
  token.length >= 2 &&
  token.length <= 20 &&
  /^\p{L}/u.test(token) && // not "5+" from "5+ years"
  (/^\p{Lu}{2,6}\d?$/u.test(token) ||
    /^\p{Lu}\p{Ll}+\p{Lu}\p{L}*$/u.test(token) ||
    /[+#]|\.js$/i.test(token));
// All-caps lines ("FULL TIME, REMOTE") would turn every word into an acronym candidate
const isMostlyUpperCase = (line: string) => {
  const letters = line.match(/\p{L}/gu) ?? [];
  const upper = line.match(/\p{Lu}/gu) ?? [];
  return letters.length >= 8 && upper.length / letters.length > 0.6;
};
// Candidate tokens of a line. In all-caps lines only one-word list items count, so
// "MQTT, UART, SPI" keeps its acronyms but "NOT REMOTE, FULL TIME" yields nothing.
const candidateTokens = (line: string) =>
  isMostlyUpperCase(line)
    ? line
        .split(/[,;/]/)
        .map((item) => rawTokenize(item))
        .filter((tokens) => tokens.length === 1)
        .flat()
    : rawTokenize(line);
// Acronyms that are not skills
// prettier-ignore
const NOT_SKILLS = new Set(["CV", "OR", "AND", "THE", "WE", "YOU", "US", "TR", "EN", "VE", "ILE", "IK", "HR", "CEO",
  "CTO", "CFO", "VP", "LTD", "AS", "INC", "LLC", "TL", "USD", "EUR", "KM", "SGK", "BES", "TA", "IP",
  // places, time zones, company types, work arrangements
  "UK", "EU", "USA", "UAE", "EMEA", "APAC", "LATAM", "AMER", "NYC", "GMT", "UTC", "CET", "EST", "PST", "GMBH", "PLC", "SA",
  "AG", "BV", "FTE", "PTO", "WFH", "ASAP", "FAQ", "PS", "NB", "ETC", "IE", "EG",
  // ordinary words written in capitals for emphasis ("exemplary PEOPLE experiences")
  "PEOPLE", "TEAM", "OUR", "JOIN", "ABOUT", "WHO", "WHAT", "HOW", "WHY", "JOB", "ROLE", "NOTE", "NEW", "NOW"]);

const IMPORTANCE_RANK: Record<Importance, number> = {
  preferred: 0,
  normal: 1,
  required: 2,
};

/**
 * Extract weighted keywords from a job ad: bilingual dictionary skills plus tool-like
 * tokens (acronyms, CamelCase) that are not in the dictionary. Conditions (driving
 * licence, age, ...) come out separately and yield no keywords.
 */
export const extractJobAd = (ad: string) => {
  const byKey = new Map<string, AdKeyword>();
  const conditions: { kind: ConditionKind; line: string }[] = [];
  const add = (key: string, keyword: AdKeyword) => {
    const existing = byKey.get(key);
    if (
      !existing ||
      IMPORTANCE_RANK[keyword.importance] > IMPORTANCE_RANK[existing.importance]
    ) {
      byKey.set(key, keyword);
    }
  };

  const adLang = detectLang(ad);
  const lines = ad.split(/\r?\n/).filter((line) => line.trim());
  const headings = lines.map(parseHeading);
  // Without headings the requirements are prose in the intro block too
  const hasHeadings = headings.some(Boolean);
  let block: Block = "intro";
  let isTitleLine = true;
  let phraseCount = 0;
  for (const [i, line] of Array.from(lines.entries())) {
    const heading = headings[i];
    let content = line;
    const onTitleLine = isTitleLine;
    if (isTitleLine) {
      // A short first line is the title: "Data Analyst (Weekday AI, Bengaluru)", where
      // the parentheses hold company/location. A first line that is a whole sentence
      // keeps them: "...a data analyst (SQL, Python) to join...".
      if (content.trim().split(/\s+/).length <= 8) {
        content = content.replace(/\([^()]*\)/g, " ");
      }
      isTitleLine = false;
    }
    if (heading) {
      block = heading.block;
      if (!heading.content.trim()) continue;
      content = heading.content; // "Requirements: Python, SQL"
    }
    if (block === "skip") continue;
    // "Lumen Software (B2B SaaS) - Berlin": the line under the title names the employer.
    // Its first part, outside parentheses, is a name with no skill, unlike "SQL - 3 years"
    // or "Python | Django | Remote".
    const isCompanyLine =
      i === 1 &&
      !headings[0] &&
      !heading &&
      line.trim().split(/\s+/).length <= 10 &&
      /\s[-–|]\s/.test(line) &&
      !containsSkill(line.split(/\s[-–|]\s/)[0].replace(/\([^()]*\)/g, " "));
    if (isCompanyLine) continue;
    const spans = findConditionSpans(content);
    spans.forEach(({ kind }) => conditions.push({ kind, line }));
    if (spans.length) content = withoutConditions(content, spans);
    // After conditions: "We participate in E-Verify" still says work permit
    content = withoutBoilerplate(content);
    // After blanking: a condition's own marker ("ehliyet zorunludur") stays with it
    const parts = importanceParts(content, block);

    const context = line.trim();
    const text = toTokenizedText(content);
    const covered = new Set<string>(); // tokens already part of a dictionary match
    const fields: AdKeyword[] = [];

    SKILLS.forEach((skill, index) => {
      const spans = skill.phrases
        .map((phrase) => findPhraseSpan(text, phrase))
        .filter((s): s is string => Boolean(s));
      const span = spans[0];
      if (!span) return;
      // The intro describes the employer ("a retail bank", "900 çalışanlı gıda üreticisi"):
      // its industry words are not asked of the candidate. Without headings the intro is
      // the whole ad, so only sentences describing the company are left out, both as a
      // mention and for importance. The title line still counts.
      const domain = skill.category === "domain" && !onTitleLine;
      const asked = domain ? parts.filter((p) => !p.companyIntro) : parts;
      if (
        domain &&
        ((block === "intro" && hasHeadings) ||
          (!mentions(asked, skill.phrases).length &&
            mentions(parts, skill.phrases).length))
      ) {
        return;
      }
      const importance = importanceIn(asked, skill.phrases);
      const weight = WEIGHTS[importance];
      // All matched forms, so "SAP FI" covers "FI" even though "SAP" matched first
      spans.forEach((s) => tokenize(s).forEach((token) => covered.add(token)));
      const forms = [...skill.en, ...skill.tr].map(foldText);
      const keyword: AdKeyword = {
        kind: "dict",
        // The ad's own wording ("Bordro") when uninflected, else the dictionary label
        label: forms.includes(foldText(span))
          ? span
          : getSkillLabel(skill, adLang),
        skill,
        phrases: skill.phrases,
        importance,
        weight: weight * (skill.category === "soft" ? SOFT_WEIGHT_FACTOR : 1),
        context,
      };
      if (skill.category === "edu") fields.push(keyword);
      else add(`skill:${index}`, keyword);
    });

    // Fields of study listed together are alternatives ("İktisat veya İşletme",
    // "Computer Science, Statistics or related"): one keyword any of them satisfies.
    // Degree levels stay separate, since "Bachelor's in CS" needs both.
    if (fields.length > 1) {
      const label = fields.map((f) => f.label).join(" / ");
      add(`edu:${foldText(label)}`, {
        ...fields[0],
        label,
        phrases: fields.flatMap((f) => f.phrases),
        alternatives: true,
      });
    } else {
      fields.forEach((f) => add(`edu:${foldText(f.label)}`, f));
    }

    for (const token of candidateTokens(content)) {
      if (
        !looksLikeTechToken(token) ||
        NOT_SKILLS.has(foldText(token).toUpperCase()) ||
        covered.has(foldText(token)) || // "MS" of a matched "MS Office"
        containsSkill(token)
      ) {
        continue;
      }
      const phrases = [toPhrase(token)];
      const importance = importanceIn(parts, phrases);
      add(`token:${foldText(token)}`, {
        kind: "token",
        label: token,
        phrases,
        importance,
        weight: WEIGHTS[importance] * UNKNOWN_WEIGHT_FACTOR,
        context,
      });
    }

    // Domain phrases from what the ad asks for; without headings only from bulleted
    // lines, since its prose is mostly about the employer
    const asksPhrases =
      !onTitleLine &&
      // Fields of study are the dictionary's job ("Endüstri Mühendisliği mezunu")
      !hasMarker(toWords(content), EDUCATION_MARKERS) &&
      (hasHeadings
        ? PHRASE_BLOCKS.includes(block) &&
          (BULLET.test(line) ||
            content.split(/\s+/).length <= MAX_PHRASE_LINE_WORDS)
        : BULLET.test(line));
    if (!asksPhrases) continue;
    // A phrase inherits no requirement from its block: only an explicit marker
    const marked = hasMarker(toWords(content), INLINE_REQUIRED);
    const isBoundary = isMostlyUpperCase(content)
      ? () => false
      : looksLikeTechToken;
    for (const candidate of extractPhrases(
      content,
      adLang,
      isBoundary,
      covered,
      block === "responsibilities"
    )) {
      const key = `phrase:${candidate.key}`;
      if (!byKey.has(key) && phraseCount >= MAX_PHRASES) break;
      if (!byKey.has(key)) phraseCount++;
      const phrases = candidate.forms.map(toPhrase);
      const found = importanceIn(parts, phrases);
      const importance = found === "required" && !marked ? "normal" : found;
      add(key, {
        kind: "phrase",
        label: candidate.label,
        phrases,
        importance,
        weight: WEIGHTS[importance] * PHRASE_WEIGHT_FACTOR,
        context,
      });
    }
  }
  return {
    keywords: Array.from(byKey.values()),
    conditions: toConditions(conditions),
  };
};

export const extractKeywords = (ad: string): AdKeyword[] =>
  extractJobAd(ad).keywords;
export const extractConditions = (ad: string) => extractJobAd(ad).conditions;
