import { foldText } from "lib/fold-text";
import {
  SKILLS,
  getSkillLabel,
  type SkillEntry,
} from "lib/job-match/dictionary";
import {
  detectLang,
  findPhraseSpan,
  hasPhrase,
  rawTokenize,
  toPhrase,
  tokenize,
  toTokenizedText,
  type Phrase,
} from "lib/job-match/text";

export type Importance = "required" | "normal" | "preferred";

export interface AdKeyword {
  label: string; // dictionary label, or the token as written in the ad
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
    "sorumluluk", "gorev", "is tanimi", "neler yapacaksin", "neler yapacaksiniz"]],
  ["skip", ["benefit", "we offer", "perks", "about us", "who we are", "why join", "sunduklarimiz", "neler sunuyoruz",
    "hakkimizda", "yan haklar", "biz kimiz", "olanaklar", "imkanlar"]],
];

// Inline markers that make a single line "preferred" or "required" regardless of its block
// prettier-ignore
const INLINE_PREFERRED = ["is a plus", "a plus", "big plus", "strong plus", "nice to have", "preferred", "is an advantage", "bonus",
  "tercih sebebi", "tercihen", "arti olarak", "avantaj"];
// prettier-ignore
const INLINE_REQUIRED = ["must have", "required", "is a must", "zorunlu", "mutlaka", "sart"];

const WEIGHTS: Record<Importance, number> = {
  required: 2,
  normal: 1,
  preferred: 0.5,
};
// Keywords found outside the dictionary are less certain to be real skills
const UNKNOWN_WEIGHT_FACTOR = 0.7;
// ATS screening is driven by hard skills; soft skills count, but half as much
const SOFT_WEIGHT_FACTOR = 0.5;

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
  "CTO", "CFO", "VP", "LTD", "AS", "INC", "LLC", "TL", "USD", "EUR", "KM", "SGK", "BES",
  // places, time zones, company types, work arrangements
  "UK", "EU", "USA", "UAE", "EMEA", "APAC", "LATAM", "NYC", "GMT", "UTC", "CET", "EST", "PST", "GMBH", "PLC", "SA", "AG",
  "BV", "FTE", "PTO", "WFH", "ASAP", "FAQ", "PS", "NB", "ETC", "IE", "EG"]);

const IMPORTANCE_RANK: Record<Importance, number> = {
  preferred: 0,
  normal: 1,
  required: 2,
};

/**
 * Extract weighted keywords from a job ad: bilingual dictionary skills plus tool-like
 * tokens (acronyms, CamelCase) that are not in the dictionary.
 */
export const extractKeywords = (ad: string): AdKeyword[] => {
  const byKey = new Map<string, AdKeyword>();
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

    const importance = getImportance(content, block);
    const weight = WEIGHTS[importance];
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
      // its industry words are not asked of the candidate. The title line still counts.
      if (
        block === "intro" &&
        hasHeadings &&
        !onTitleLine &&
        skill.category === "domain"
      ) {
        return;
      }
      // All matched forms, so "SAP FI" covers "FI" even though "SAP" matched first
      spans.forEach((s) => tokenize(s).forEach((token) => covered.add(token)));
      const forms = [...skill.en, ...skill.tr].map(foldText);
      const keyword: AdKeyword = {
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
      add(`token:${foldText(token)}`, {
        label: token,
        phrases: [toPhrase(token)],
        importance,
        weight: weight * UNKNOWN_WEIGHT_FACTOR,
        context,
      });
    }
  }
  return Array.from(byKey.values());
};
