import { foldText } from "lib/fold-text";
import { hasPhrase, toPhrase, toTokenizedText } from "lib/job-match/text";

/**
 * Conditions of an ad that are not skills: they are not keywords and do not count in
 * the score. Tiers are ordered from job-related to likely discriminatory (eval/README.md,
 * "Koşul etiketleme kılavuzu"); gender and marital status sit in different tiers.
 */
export type ConditionTier =
  | "credential" // the candidate can hold it: driving licence, own car
  | "logistics" // work permit, residence, travel, shifts
  | "contextual" // military service, criminal record, health report
  | "protected-exception" // protected, with a legal exception (6701 md. 7): gender, age, disability
  | "protected" // protected, weak exception: marital status, children, pregnancy, religion
  | "lifestyle"; // smoking, appearance

// Tier order, then kind order: the order conditions are returned in
export const CONDITION_KINDS = [
  ["license", "credential"],
  ["own-vehicle", "credential"],
  ["work-permit", "logistics"],
  ["residence", "logistics"],
  ["travel", "logistics"],
  ["shift", "logistics"],
  ["military", "contextual"],
  ["criminal-record", "contextual"],
  ["health-report", "contextual"],
  ["gender", "protected-exception"],
  ["age", "protected-exception"],
  ["disability", "protected-exception"],
  ["marital", "protected"],
  ["children", "protected"],
  ["pregnancy", "protected"],
  ["religion", "protected"],
  ["smoking", "lifestyle"],
  ["appearance", "lifestyle"],
] as const satisfies readonly (readonly [string, ConditionTier])[];
export type ConditionKind = (typeof CONDITION_KINDS)[number][0];

export interface Condition {
  kind: ConditionKind;
  tier: ConditionTier;
  text: string; // the ad line it came from
  found?: boolean; // in the resume; only for kinds a resume can show (RESUME_FORMS)
}

// Patterns on folded text (see foldText). Matched in this order, each masking its span,
// so "erkek adaylar için askerlik" is military only and "seyahat engeli bulunmayan" is
// not a disability. Context words keep look-alikes out ("LinkedIn Recruiter license",
// "sağlık sigortası", "smoking cessation"). No nested quantifiers: ads are user input.
// ponytail: patterns come from research, not real ads; extend them in the real-ad trial.
// "Over 18" style minimum ages are left out: legitimate, and tier 4 would flag them.
// prettier-ignore
const PATTERNS: [ConditionKind, RegExp][] = [
  ["military", /\b(?:erkek adaylar\w* (?:icin )?)?askerli[kg]\w*(?: (?:hizmet|gorev|durum)\w*)?(?: (?:tamamla|yap|bitir|muaf|tecil)\w*)?|\bmilitary service\b/g],
  ["travel", /\bseyahat\w* (?:engel|sorun)\w* (?:olmayan|bulunmayan|yok)\w*|\bsehir ?disi seyahat\w*|\b(?:willing|able) to travel\b|\btravel (?:is )?required\b/g],
  ["license", /\b(?:[a-g][12]?e?|ce|d1e) sinifi (?:ehliyet|surucu belgesi)\w*|\behliyet\w*|\bsurucu belgesi\w*|\bsrc(?: ?[1-5])? belgesi\w*|\bsrc ?[1-5]\b|\b(?:(?:full|clean|valid|current) )?(?:(?:uk|eu) )?driv(?:ing|ers?|er's) licen[cs]es?\b/g],
  ["own-vehicle", /\bkendi (?:arac|araba)\w*|\bown (?:car|vehicle|transport)\b/g],
  ["work-permit", /\bcalisma izni\w*|\bright to work\b|\b(?:eligible|authori[sz]ed) to work\b|\bwork (?:permit|authori[sz]ation)\b|\bvisa sponsorship\b/g],
  ["residence", /\bikamet\w*|\byakasi\w* (?:oturan|yasayan)\w*|\b(?:must )?(?:live|reside) (?:in|within)\b|\bcommutable distance\b/g],
  ["shift", /\bvardiyali\w*|\bvardiya\w* (?:calis|sistem|duzen)\w*|\bshift work\b|\b(?:night|rotating) shifts?\b/g],
  // bare "DBS" is also Turkish banking ("Doğrudan Borçlandırma Sistemi")
  ["criminal-record", /\badli sicil\w*|\bsabika\w*|\bcriminal record\b|\benhanced dbs\b|\bdbs (?:check|certificate|clearance)\w*|\bbackground check\w*|\b(?:security|sc|dv) clearance\b|\bguvenlik sorusturma\w*/g],
  ["health-report", /\bsaglik raporu\w*|\bmedical (?:clearance|screening)\b/g],
  // "bayan" is a gender requirement wherever it stands ("Bayan satış danışmanı") except
  // before goods and shops ("bayan giyim"); "erkek kuaför" is a job title, so "erkek"/"kadın" need a candidate word
  ["gender", /\bbayan(?:lar\w*)?\b(?! (?:giyim|ayakkabi|kuafor|terzi|reyon|urun|canta|elbise|ic giyim)\w*)|\b(?:kadin|erkek) (?:aday|personel|eleman|calisan)\w*|\b(?:sadece|yalnizca) (?:erkek|kadin)\w*|\b(?:male|female) (?:applicants?|candidates?) only\b|\b(?:males?|females?) only\b|\bonly (?:male|female)s?\b/g],
  ["age", /\b\d{2} ?[-–/] ?\d{2} yas\w*|\b\d{2} yas\w* (?:alti|ustu|arasi|gecmemis|buyuk|kucuk)\w*|\b(?:en fazla|maksimum) \d{2} yas\w*|\baged? (?:between )?\d{2} ?(?:-|–|to|and) ?\d{2}\b|\byoung and dynamic\b|\bgenc ve dinamik\b|\bdigital natives?\b/g],
  // "yurt dışı çıkışına engeli bulunmayan" is a legal bar, not a disability
  ["disability", /\bengelli (?:raporu )?(?:olmayan|bulunmayan|olmamak)\w*|\b(?:saglik|bedensel|fiziksel) (?:engel|sorun)\w* (?:olmayan|bulunmayan)\b|\bable[- ]bodied\b/g],
  ["marital", /\b(?:evli|bekar)\b|\bmedeni (?:hal|durum)\w*|\bmarital status\b|\b(?:married|unmarried)\b/g],
  ["children", /\bcocuk(?:lu|suz)\b|\bcocugu (?:olmayan|bulunmayan)\b|\bcocuk sahibi\w*|\bno children\b/g],
  ["pregnancy", /\bhamile (?:olmayan|olmamak)\w*|\bgebe olmayan\b|\bnot pregnant\b|\bevlilik plani\w*/g],
  ["religion", /\b(?:basortusuz|basortulu|turbansiz|turbanli)\w*|\b(?:christian|muslim|jewish) (?:applicants?|candidates?|only)\b/g],
  ["smoking", /\bsigara (?:ve alkol )?(?:kullanmayan|icmeyen)\w*|\bnon[- ]?smok\w*/g],
  ["appearance", /\b(?:iyi )?gorunumlu\b|\bbakimli\b|\bboy \d{3}\b|\bdovme\w* (?:olmayan|bulunmayan)\b|\bgood[- ]looking\b|\bclean[- ]shaven\b/g],
];

// Equal-opportunity sentences name the same traits but ask nothing of the candidate.
// They are blanked sentence by sentence, so a requirement next to them still counts.
// prettier-ignore
const EQUAL_OPPORTUNITY = /\b(?:(?:regardless|irrespective) of (?:age|gender|sex|race|religion|marital|disability|ethnic\w*|national\w*|sexual)|without regard to|equal opportunit\w*|discriminat\w*|encourage\w* (?:applications|applicants|candidates)|welcome applications|gozetmeksizin|ayrim yapmaksizin|ayrimcilik\w*|esit firsat\w*|basvuru\w* (?:tesvik|destekl)\w*)\b/;

// Marks left in NFC text (emoji variation selectors in "✔️") are dropped, since foldText
// drops them too and offsets must carry over between the two
const prepare = (line: string) => line.normalize("NFC").replace(/\p{M}/gu, "");

const blank = (text: string, spans: { start: number; end: number }[]) => {
  const chars = text.split(""); // UTF-16 units, like the offsets
  for (const { start, end } of spans) chars.fill(" ", start, end);
  return chars.join("");
};

// A marker right after a condition belongs to it: "B sınıfı ehliyet zorunludur" must not
// make the rest of the sentence required
// prettier-ignore
const MARKER_AFTER = /^ (?:is required|required|is a must|is mandatory|mandatory|zorunlu\w*|sart\w*|gerekli\w*|aranir\w*|beklenir\w*)\b/;

/** Condition kinds in a line with their spans, as offsets into prepare(line) */
export const findConditionSpans = (line: string) => {
  const text = prepare(line);
  let folded = foldText(text);
  // foldText keeps the length of mark-free NFC text; a character whose lowercase is
  // longer would shift the offsets, and such lines are left unmatched
  if (folded.length !== text.length) return [];
  folded = folded.replace(/[^.!?;]+/g, (sentence) =>
    EQUAL_OPPORTUNITY.test(sentence) ? " ".repeat(sentence.length) : sentence
  );
  const spans: { kind: ConditionKind; start: number; end: number }[] = [];
  for (const [kind, pattern] of PATTERNS) {
    const found = Array.from(folded.matchAll(pattern), (match) => {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const marker = folded.slice(end).match(MARKER_AFTER)?.[0] ?? "";
      return { kind, start, end: end + marker.length };
    });
    if (!found.length) continue;
    spans.push(...found);
    folded = blank(folded, found); // later patterns don't see this one's spans
  }
  return spans;
};

/** The line with condition spans blanked out, so they yield no keywords */
export const withoutConditions = (
  line: string,
  spans: ReturnType<typeof findConditionSpans>
) => blank(prepare(line), spans);

const TIER = Object.fromEntries(CONDITION_KINDS) as Record<
  ConditionKind,
  ConditionTier
>;
const ORDER = CONDITION_KINDS.map(([kind]) => kind) as ConditionKind[];

/** One condition per kind (first line wins), in tier order */
export const toConditions = (
  found: { kind: ConditionKind; line: string }[]
): Condition[] =>
  ORDER.flatMap((kind) => {
    const first = found.find((f) => f.kind === kind);
    return first ? [{ kind, tier: TIER[kind], text: first.line.trim() }] : [];
  });

// Resume wording for the kinds a resume can show. Military service is left out: telling
// a woman it is missing would be wrong; residence and travel rarely appear in a resume.
// prettier-ignore
const RESUME_FORMS: Partial<Record<ConditionKind, string[]>> = {
  license: ["ehliyet", "sürücü belgesi", "src", "driving license", "driving licence", "driver's license", "driver's licence", "driver license"],
  "own-vehicle": ["kendi aracım", "own car", "own vehicle"],
  "work-permit": ["çalışma izni", "right to work", "work permit", "work authorization", "work authorisation", "vatandaşı", "citizen"],
};

/** Marks whether the resume shows each condition it can show */
export const checkConditions = (
  conditions: Condition[],
  resumeText: string
): Condition[] => {
  const text = toTokenizedText(resumeText);
  return conditions.map((condition) => {
    const forms = RESUME_FORMS[condition.kind];
    return forms
      ? {
          ...condition,
          found: forms.some((form) => hasPhrase(text, toPhrase(form))),
        }
      : condition;
  });
};
