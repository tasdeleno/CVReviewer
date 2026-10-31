import { foldText } from "lib/fold-text";
import type { Resume } from "lib/redux/types";
import type { TextItems } from "lib/parse-resume-from-pdf/types";
import { BULLET_POINTS } from "lib/parse-resume-from-pdf/extract-resume-from-sections/lib/bullet-points";
import { getSkillLabel } from "lib/job-match/dictionary";
import type { KeywordMatch } from "lib/job-match";
import {
  tokenize,
  toTokenizedText,
  hasPhrase,
  tokenMatches,
  type Lang,
} from "lib/job-match/text";

export type SuggestionSection =
  | "summary"
  | "experience"
  | "skills"
  | "education"
  | "general";

// Which rule produced a suggestion; stable ids for the eval and the UI
export type SuggestionKind =
  | "missing-skills"
  | "missing-in-experience"
  | "soft-skills"
  | "education"
  | "only-in-skills"
  | "no-summary"
  | "title"
  | "weak-verbs"
  | "unquantified"
  | "long-bullets"
  | "low-signal";

export interface Suggestion {
  kind: SuggestionKind;
  section: SuggestionSection;
  priority: "high" | "medium" | "low";
  message: string; // Turkish UI text
  examples?: string[]; // resume lines the message is about
  terms?: string[]; // ad keywords or title the message is about, for a UI heading
}

export interface AtsCheck {
  ok: boolean;
  message: string;
}

// Resume section titles -> canonical section (folded keywords, same idea as the parser's)
// prettier-ignore
const SECTION_KEYWORDS: [SuggestionSection, string[]][] = [
  ["summary", ["summary", "objective", "profil", "about", "ozet", "hakkimda", "hedef"]],
  ["skills", ["skill", "tool", "technolog", "competenc", "yetenek", "beceri", "yetkinlik", "teknoloji", "araclar"]],
  ["education", ["education", "qualification", "academic", "egitim", "ogrenim"]],
  ["experience", ["experience", "employment", "work", "history", "job", "deneyim", "tecrube", "calisma", "is gecmisi"]],
];
const toCanonicalSection = (title = "") => {
  const folded = foldText(title);
  return SECTION_KEYWORDS.find(([, keywords]) =>
    keywords.some((keyword) => folded.includes(keyword))
  )?.[0];
};

const IMPORTANCE_TR = {
  required: "zorunlu",
  normal: "istenen",
  preferred: "tercih sebebi",
};
type Langs = { ad: Lang; resume: Lang };
/** The ad's wording; for a resume in the other language also its equivalent there */
const labelOf = (match: KeywordMatch, langs: Langs) => {
  const translated =
    match.skill && !match.alternatives && langs.ad !== langs.resume
      ? getSkillLabel(match.skill, langs.resume)
      : undefined;
  return translated && translated !== match.label
    ? `${match.label} (${translated})`
    : match.label;
};
const list = (matches: KeywordMatch[], langs: Langs) =>
  matches
    .map((m) => `${labelOf(m, langs)} (${IMPORTANCE_TR[m.importance]})`)
    .join(", ");
const byWeight = (a: KeywordMatch, b: KeywordMatch) => b.weight - a.weight;
const quote = (line: string) => {
  // The ad's own bullet glyph; "-20% cost" (no space) keeps its minus
  const text = line.replace(/^[-–•*·]\s+/, "");
  return `«${text.length > 110 ? text.slice(0, 107) + "…" : text}»`;
};

// prettier-ignore
const WEAK_START_EN = /^((was|were) )?(responsible for|help(ed|s)?|assist(ed|s)?|support(ed|s)?|worked on|involved in|participated in|duties included|tasked with|handled|in charge of)\b(?! (desk|team)\b)/i;
// prettier-ignore
const WEAK_END_TR = /(yer aldım|katıldım|ilgilendim|çalıştım)\.?$/i;
// Duty phrasing that is weak wherever it sits: "…işlerinden sorumluydum ve …"
// prettier-ignore
const WEAK_ANY_TR = /(sorumluydum|sorumlu oldum|yardımcı oldum|destek oldum|destek verdim|görev aldım)(?=[\s,.;]|$)/i;
const STRONG_VERBS: Record<Lang, string> = {
  en: "Led, Built, Reduced, Increased, Launched, Automated",
  tr: "yönettim, geliştirdim, azalttım, artırdım, hayata geçirdim, otomatize ettim",
};

// Words too common in ads and bullets to show two lines are about the same thing (folded)
// prettier-ignore
const FILLER_WORDS = new Set(["with", "that", "this", "from", "have", "will", "your", "their", "into", "using",
  "team", "work", "working", "experience", "strong", "ability", "skills", "knowledge", "including", "other",
  "icin", "olan", "gibi", "olarak", "ile", "sahip", "deneyim", "deneyimli", "bilgi", "bilgisi", "konusunda",
  "olmak", "yapmak", "etmek", "tum", "ilgili", "alaninda", "uzere"]);

/** Resume bullet sharing the most meaningful words with an ad line, for "add it here" hints */
const findClosestBullet = (bullets: string[], adLine: string) => {
  const adWords = new Set(
    tokenize(adLine).filter((t) => t.length > 3 && !FILLER_WORDS.has(t))
  );
  let best: { bullet: string; overlap: number } | undefined;
  for (const bullet of bullets) {
    const overlap = new Set(tokenize(bullet).filter((t) => adWords.has(t)))
      .size;
    if (overlap > 0 && (!best || overlap > best.overlap)) {
      best = { bullet, overlap };
    }
  }
  return best?.bullet;
};

// A title names a role; this keeps company names ("Acme Corp") and headings ("About Us")
// on the first line from being taken for one (folded word starts)
// prettier-ignore
const ROLE_WORDS = ["analyst", "developer", "engineer", "manager", "specialist", "designer", "consultant",
  "accountant", "architect", "scientist", "coordinator", "assistant", "director", "officer", "representative",
  "executive", "associate", "administrator", "recruiter", "intern", "lead", "uzman", "muhendis", "gelistirici",
  "analist", "mudur", "yonetici", "sorumlu", "asistan", "temsilci", "tasarimci", "danisman", "muhasebe",
  "stajyer", "sefi", "direktor", "koordinator", "lider"];
// prettier-ignore
const SENIORITY_WORDS = new Set(["senior", "sr", "junior", "jr", "principal", "staff", "mid", "midlevel",
  "head", "kidemli", "uzman", "yardimcisi"]);
// Title words with the same meaning in EN/TR (folded), so "Data Engineer" satisfies
// "Veri Mühendisi" and "Frontend Developer" satisfies "Frontend Geliştirici"
const MANAGER_WORDS = ["manager", "mudur", "yonetici"];
// prettier-ignore
const TITLE_SYNONYMS = [["engineer", "developer", "muhendis", "gelistirici"], ["specialist", "uzman"],
  ["analyst", "analist"], MANAGER_WORDS, ["representative", "temsilci"],
  ["coordinator", "koordinator"], ["consultant", "danisman"], ["designer", "tasarimci"],
  ["assistant", "asistan"], ["data", "veri"], ["software", "yazilim"], ["sales", "satis"],
  ["marketing", "pazarlama"], ["digital", "dijital"]];
// Scope words a title can drop: "Bölge Satış Temsilcisi" is satisfied by "Satış Temsilcisi"
const SCOPE_WORDS = new Set(["bolge", "regional", "area", "field", "saha"]);

/** Ways a resume can state the title: synonyms per word, and "Head of X" for "X Manager" */
const titleVariants = (core: string[]) => {
  const words = core.filter((w) => !SCOPE_WORDS.has(w));
  // The ad's own word stays an option: only the last phrase word may be inflected, so
  // "Engineering Manager" must still match itself, not just "engineer manager"
  const options = (words.length ? words : core).map((w) =>
    Array.from(
      new Set([
        w,
        ...(TITLE_SYNONYMS.find((group) =>
          group.some((s) => tokenMatches(w, s))
        ) ?? []),
      ])
    )
  );
  let variants: string[][] = [[]];
  for (const words of options) {
    variants = variants.flatMap((v) => words.map((w) => [...v, w]));
  }
  return variants.flatMap((v) =>
    MANAGER_WORDS.includes(v[v.length - 1])
      ? [v, ["head", "of", ...v.slice(0, -1)]]
      : [v]
  );
};

/**
 * The job title, if the ad's first line looks like one: the part before " - ", "," or "|",
 * without parentheses. `core` drops seniority words, so "Senior Data Analyst" is satisfied
 * by a resume saying "Data Analyst".
 */
const getAdTitle = (ad: string) => {
  const first = ad
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!first) return undefined;
  const title = first
    .replace(/\([^()]*\)/g, " ")
    .split(/\s[-–—|]\s|[,|]/)[0]
    .trim();
  const words = tokenize(title);
  if (
    words.length === 0 ||
    words.length > 6 ||
    !words.some((w) => ROLE_WORDS.some((role) => w.startsWith(role)))
  ) {
    return undefined;
  }
  const core = words.filter((w) => !SENIORITY_WORDS.has(w));
  // "Uzman" alone is all seniority; nothing left to look for in the resume
  return core.length ? { title, core } : undefined;
};

export const suggest = ({
  jobAd,
  matches,
  resume,
  resumeText,
  langs,
  insufficient = false,
}: {
  jobAd: string;
  matches: KeywordMatch[];
  resume: Resume;
  resumeText: string;
  langs: Langs;
  insufficient?: boolean;
}): Suggestion[] => {
  const lang = langs.resume;
  const suggestions: Suggestion[] = [];
  // An ad with too few skills gives no reliable "missing" list: say so instead
  const missing = insufficient
    ? []
    : matches.filter((m) => !m.found).sort(byWeight);
  if (insufficient) {
    suggestions.push({
      kind: "low-signal",
      section: "general",
      priority: "high",
      message:
        "İlandan yeterli beceri çıkarılamadı; skor güvenilir değil. Eksik beceri önerisi verilmedi. İlanın gereksinim kısmını ayrıca okuyup CV'ni ona göre kontrol et.",
    });
  }
  const hasRequired = (ms: KeywordMatch[]) =>
    ms.some((m) => m.importance === "required");
  const parsedBullets = [
    ...resume.workExperiences.flatMap((w) => w.descriptions),
    ...resume.projects.flatMap((p) => p.descriptions),
  ].filter((b) => b.trim());
  // No experience section was recognized (no headings, "Career History"): the bullet
  // lines are still in the text. ponytail: this also takes bulleted skills/education
  // lines; scope it to the header block if that skews unquantified on real resumes.
  const bullets =
    parsedBullets.length || resume.workExperiences.length
      ? parsedBullets
      : resumeText.split("\n").flatMap((line) => {
          const text = line.trim();
          const glyph = BULLET_POINTS.find((b) => text.startsWith(b));
          const rest = glyph ? text.slice(glyph.length).trim() : "";
          return rest ? [rest] : [];
        });

  // 1. Missing tools/technologies/certificates/languages -> Skills
  const toSkills = missing.filter(
    (m) =>
      m.kind !== "phrase" &&
      (!m.skill || ["tech", "tool", "cert", "lang"].includes(m.skill.category))
  );
  if (toSkills.length) {
    suggestions.push({
      kind: "missing-skills",
      section: "skills",
      priority: hasRequired(toSkills) ? "high" : "medium",
      message: `İlanda geçen ama CV'nde bulunmayan araç/teknolojiler: ${list(
        toSkills,
        langs
      )}. Gerçekten biliyorsan Yetenekler bölümüne ekle; mümkünse bir deneyim maddesinde de nasıl kullandığını göster.`,
      terms: toSkills.map((m) => labelOf(m, langs)),
    });
  }

  // 2. Missing methods/domain knowledge and phrases -> the closest experience bullet
  for (const m of missing
    .filter(
      (m) =>
        m.kind === "phrase" ||
        (m.skill && ["method", "domain"].includes(m.skill.category))
    )
    .slice(0, 4)) {
    const closest = findClosestBullet(bullets, m.context);
    const head = `«${labelOf(m, langs)}» ilanda ${
      IMPORTANCE_TR[m.importance]
    } (${quote(m.context)}).`;
    suggestions.push({
      kind: "missing-in-experience",
      section: "experience",
      priority: m.importance === "required" ? "high" : "medium",
      message: closest
        ? `${head} Bu deneyimin varsa en yakın maddene ekle:`
        : `${head} Bu deneyimin varsa bir iş deneyimi maddesinde somut bir örnekle göster.`,
      examples: closest ? [closest] : undefined,
      terms: [labelOf(m, langs)],
    });
  }

  // 3. Missing soft skills -> Summary
  const soft = missing.filter((m) => m.skill?.category === "soft");
  if (soft.length) {
    suggestions.push({
      kind: "soft-skills",
      section: "summary",
      priority: "low",
      message: `İlandaki kişisel yetkinlikler CV'nde geçmiyor: ${list(
        soft,
        langs
      )}. Özetinde ya da bir maddede somut bir örnekle (ör. "5 kişilik ekibe liderlik ettim") göster; sadece sıfat olarak yazma.`,
      terms: soft.map((m) => labelOf(m, langs)),
    });
  }

  // 4. Missing degrees/fields -> Education
  const edu = missing.filter(
    (m) => m.skill?.category === "edu" || m.skill?.category === "degree"
  );
  if (edu.length) {
    suggestions.push({
      kind: "education",
      section: "education",
      priority: hasRequired(edu) ? "medium" : "low",
      message: `İlandaki eğitim şartları CV'nde görünmüyor: ${list(
        edu,
        langs
      )}. Uygun bir bölüm/derecen varsa Eğitim'de açıkça yaz.`,
      terms: edu.map((m) => labelOf(m, langs)),
    });
  }

  // 5. Required skills that only appear in the Skills list (not phrases: a Skills
  // list rarely holds a duty phrase, and when it does it is a tool name)
  const onlyInSkills = matches.filter(
    (m) =>
      m.kind !== "phrase" &&
      m.importance === "required" &&
      m.sections.length > 0 &&
      m.sections.every((section) => toCanonicalSection(section) === "skills")
  );
  if (onlyInSkills.length) {
    suggestions.push({
      kind: "only-in-skills",
      section: "experience",
      priority: "medium",
      message: `Zorunlu becerilerden ${onlyInSkills
        .map((m) => labelOf(m, langs))
        .join(
          ", "
        )} yalnızca Yetenekler listesinde geçiyor. İşe alımcılar bağlam arar: en az birini bir deneyim maddesinde sonucuyla birlikte anlat.`,
      terms: onlyInSkills.map((m) => labelOf(m, langs)),
    });
  }

  // 6. Summary and target title
  const title = getAdTitle(jobAd);
  const resumeTokens = toTokenizedText(resumeText);
  const titleInResume =
    title &&
    titleVariants(title.core).some((tokens) =>
      hasPhrase(resumeTokens, {
        tokens,
        caseSensitive: false,
        turkishSuffixes: true,
      })
    );
  if (!resume.profile.summary.trim()) {
    const top = matches
      .filter(
        (m) => m.kind !== "phrase" && m.found && m.importance === "required"
      )
      .slice(0, 3)
      .map((m) => labelOf(m, langs));
    const highlights = [
      title && `hedef unvanı («${title.title}»)`,
      top.length && `en güçlü eşleşen becerilerini (${top.join(", ")})`,
    ].filter(Boolean);
    suggestions.push({
      kind: "no-summary",
      section: "summary",
      priority: "high",
      message: highlights.length
        ? `CV'nde özet bölümü yok. 2-3 cümlelik bir özet ekle ve ${highlights.join(
            " ile "
          )} öne çıkar.`
        : "CV'nde özet bölümü yok. Kim olduğunu ve ne aradığını anlatan 2-3 cümlelik bir özet ekle.",
    });
  } else if (title && !titleInResume) {
    suggestions.push({
      kind: "title",
      section: "summary",
      priority: "medium",
      message: `İlandaki unvan («${title.title}») CV'nde geçmiyor. Gerçekten bu role uygunsan özetinde hedef unvan olarak kullan.`,
      terms: [title.title],
    });
  }

  // 7. Bullet quality
  const weak = bullets.filter(
    (b) =>
      WEAK_START_EN.test(b.trim()) ||
      WEAK_END_TR.test(b.trim()) ||
      WEAK_ANY_TR.test(b)
  );
  if (weak.length) {
    suggestions.push({
      kind: "weak-verbs",
      section: "experience",
      priority: "medium",
      message: `${weak.length} madde görev tanımı gibi yazılmış (zayıf fiil). Ne yaptığını ve sonucunu öne çıkaran güçlü fiillerle yeniden yaz (${STRONG_VERBS[lang]}):`,
      examples: weak.slice(0, 3),
    });
  }
  // A digit glued to a letter is part of a name, not a quantity: B2B, GA4, 3PL, S4.
  // A unit after the number still makes it one: 10k, 50M, 20ms, 3x, 99th.
  const unquantified = bullets.filter(
    (b) =>
      !/(^|[^\p{L}\d])\d+([.,]\d+)?(k|m|bn|ms|s|h|x|th|st|nd|rd)?(?![\p{L}\d])/iu.test(
        b
      )
  );
  if (bullets.length >= 3 && unquantified.length / bullets.length > 0.5) {
    suggestions.push({
      kind: "unquantified",
      section: "experience",
      priority: "medium",
      message: `Maddelerinin ${unquantified.length}/${bullets.length} tanesinde ölçülebilir sonuç yok. Sayı ekle (%, süre, tutar, kişi sayısı); örneğin şu maddeler:`,
      examples: unquantified.slice(0, 2),
    });
  }
  const long = bullets.filter((b) => b.split(/\s+/).length > 40);
  if (long.length) {
    suggestions.push({
      kind: "long-bullets",
      section: "experience",
      priority: "low",
      message: `${long.length} madde 40 kelimeden uzun; ATS ve okuyucu için 1-2 satıra indir.`,
      examples: long.slice(0, 1),
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => order[a.priority] - order[b.priority]);
};

/**
 * Column-by-column reading order: the text jumps back up to the top and to the right, and
 * stays right. A page break also jumps up but returns to the left margin, even if the
 * new page starts with a centered header.
 */
const looksMultiColumn = (textItems: TextItems) => {
  let minX = Infinity; // a loop, not Math.min(...xs): huge PDFs overflow the call stack
  for (const item of textItems) minX = Math.min(minX, item.x);
  const isRight = (i: number) => textItems[i].x > minX + 100;
  return textItems.some(
    (item, i) =>
      i > 0 &&
      item.y - textItems[i - 1].y > 100 &&
      [i, i + 1, i + 2, i + 3]
        .filter((j) => j < textItems.length)
        .every(isRight)
  );
};

export const checkAts = (textItems: TextItems, resume: Resume): AtsCheck[] => {
  if (!textItems.some((item) => item.text.trim())) {
    return [
      {
        ok: false,
        message:
          "PDF'te seçilebilir metin yok (taranmış görsel olabilir). ATS bu CV'den hiçbir şey okuyamaz; metin tabanlı bir PDF olarak kaydet.",
      },
    ];
  }
  const { profile } = resume;
  const check = (ok: boolean, good: string, bad: string): AtsCheck => ({
    ok,
    message: ok ? good : bad,
  });
  return [
    check(
      !looksMultiColumn(textItems),
      "Metin tek sütun gibi sırayla okunuyor.",
      "Çok sütunlu düzen algılandı: ATS metni sütun sütun okuyor, bölümler karışabilir. Tek sütunlu bir şablon daha güvenli."
    ),
    check(
      Boolean(profile.name),
      "İsim okundu.",
      "İsim okunamadı: en üste, tek başına bir satırda yaz."
    ),
    check(
      Boolean(profile.email),
      "E-posta okundu.",
      "E-posta okunamadı: üst bilgide düz metin olarak yaz (ikon/görsel içinde değil)."
    ),
    check(
      Boolean(profile.phone),
      "Telefon okundu.",
      "Telefon okunamadı: üst bilgide düz metin olarak yaz."
    ),
    check(
      resume.workExperiences.length > 0,
      "İş deneyimi bölümü okundu.",
      'İş deneyimi bölümü okunamadı: "Experience" / "İş Deneyimi" gibi standart bir başlık kullan.'
    ),
    check(
      resume.educations.length > 0,
      "Eğitim bölümü okundu.",
      'Eğitim bölümü okunamadı: "Education" / "Eğitim" başlığını kullan.'
    ),
    check(
      resume.skills.descriptions.length > 0 ||
        resume.skills.featuredSkills.some((s) => s.skill),
      "Yetenekler bölümü okundu.",
      'Yetenekler bölümü okunamadı: "Skills" / "Yetenekler" başlıklı ayrı bir bölüm ekle.'
    ),
  ];
};
