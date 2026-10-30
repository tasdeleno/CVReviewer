import { foldText } from "lib/fold-text";
import { toTurkishCompoundStems } from "lib/job-match/dictionary";
import { rawTokenize, tokenMatches, type Lang } from "lib/job-match/text";

/**
 * Domain phrases the dictionary doesn't know ("hasta bakımı", "discharge planning"): runs
 * of content words between stop words, as in RAKE. A run of 2-3 words is a candidate.
 * "ve"/"and" end a run too: joining across them made mostly noise on dev ("physiotherapists
 * and families", "fiyat ve vade"); "ölçme ve değerlendirme" is the dictionary's job.
 * ponytail: word lists, not a POS tagger; a tagger (wink-nlp for EN) is the next step
 * if phrase precision stays low.
 */

const words = (list: string) => new Set(list.split(/\s+/).filter(Boolean));

// Folded words that end a run: function words, the qualifiers around a skill
// ("experience with", "konusunda deneyimli"), traits, pay and words about the degree
// prettier-ignore
const STOP = words(`
  a an the and or nor of to in on at for with from by as into within across per up via out over under about
  including such like etc eg ie our your their its his her we you they it this that these those who whom
  which what where when how why all any each every some other others more most less both either is are be
  been being was were will would can could should must may might shall have has had having do does did
  not no if than then also well very highly plus preferred required requirement requirements ideally
  preferably least minimum maximum min max years year yrs months experience experienced knowledge ability
  able proficiency proficient understanding familiarity familiar exposure strong excellent good great
  solid proven demonstrated sound deep effective effectively basic hands relevant related similar
  equivalent ideal successful successfully safely accurately closely quickly efficiently regularly timely
  dynamic motivated self energetic proactive enthusiastic passionate friendly reliable flexible punctual
  positive hardworking hard detail oriented organised organized eager driven ambitious curious willing
  comfortable confident fluent fluency previous prior current currently ll re ve s t degree bachelor
  bachelors master masters phd graduate diploma but so because while whether though although yet still
  even only just really actually always often sometimes never already again around through throughout
  before after during until since between among against without upon along toward towards behind beyond
  inside outside above below near onto off down now today them us him me my mine yours theirs ours
  themselves yourself there here everything anything something nothing everyone someone anyone new real
  right fun best better high higher fast faster large small various multiple many much several few
  another unique different specific overall general key main core clear full fully part based focused
  powered temporary permanent one two three four five six seven eight nine ten fifty hundred etc vs
  opportunity opportunities compensation bonus reimbursement eligible potential earning salary pay
  regarding term weekdays weekends weekend altinda
  ve veya ya da de ile icin bir bu su o olarak olan olmak gibi en az cok daha her tum butun ilgili uzere kadar
  ait ayni diger sahip sahibi konusunda konularinda alaninda alanlarinda hakim hakimiyeti bilgisi bilgili
  bilgisine deneyimi deneyimli deneyime tecrubesi tecrubeli tecrubeye yatkin uygun istekli tercihen
  mumkunse tercih tercihimiz sebebi sebebidir arti avantaj avantajdir zorunlu mutlaka sart yil yillik ay
  mezun mezunu mezuniyet universite universitelerin lisans onlisans yuksekokul yuksekokullarinin fakulte
  fakultesi bolum bolumu bolumunden bolumlerinden iyi guclu duzeyde seviyede derecede dinamik enerjik
  guler yuzlu titiz pozitif disiplinli duzenli dikkatli ozenli guvenilir durust prezentabl kendini acik
  yeni uzerinde zamaninda icinde icerisinde dahilinde dogrultusunda kapsaminda hakkinda tarafindan ayrica
  aday adaylar arayan aranan arkadas arkadaslar olmasi olmali gerekli gerekmektedir birlikte basta herhangi
  deneyim tecrube becerisi becerileri yetenegi yetkinligi gelismis yuksek asinalik duzey vb vs eden veren
  yapan alan genel nitelikler hafta etkin aktif onem odakli dogru gore tabanli bazli yonelik ici zamanli dostu
  bilen misiniz musunuz ister hoc
`);
// Head verbs of duty lines, in base, -s and past forms only: -ing forms are nouns as often
// as verbs ("planning", "relationship building")
// prettier-ignore
const EN_VERBS = words(`manage ensure provide carry keep deliver assess develop maintain prepare use perform
  handle conduct coordinate create build drive own assist collaborate communicate monitor join apply
  administer contribute participate oversee implement identify resolve respond serve greet operate follow
  comply achieve meet exceed establish promote increase improve reduce act make take get give bring
  work`);
const EN_VERB_FORMS = new Set(
  Array.from(EN_VERBS).flatMap((v) =>
    /[^aeiou]y$/.test(v)
      ? [v, `${v.slice(0, -1)}ies`, `${v.slice(0, -1)}ied`] // apply, applies, applied
      : [v, `${v}s`, `${v.replace(/e$/, "")}ed`]
  )
);
const EN_IRREGULAR = words("built kept made took got gave brought led met");
// Verbs that are also nouns ("customer support", "code review") end a run only at its
// start, where a duty sentence puts its verb: "tune queries", "support GMs"
// prettier-ignore
const LEADING_VERBS = words(`understand translate explain strengthen tune ship move review troubleshoot solve
  extend enjoy support coach share track partner possess automate design analyze analyse lead help define
  scale debug test write plan train report present negotiate source`);
// -ing words that open a noun phrase ("marketing automation"); other leading -ing
// words are verbs ("assessing talent quality", "automating reports")
// prettier-ignore
const ING_NOUNS = words(`marketing training accounting learning engineering manufacturing nursing banking
  pricing budgeting forecasting planning recruiting onboarding testing programming modeling modelling
  reporting scheduling purchasing housekeeping catering cleaning cooking coaching teaching tutoring
  bookkeeping invoicing merchandising consulting computing processing building branding advertising
  staffing fundraising`);
const isLeadingVerb = (folded: string) =>
  LEADING_VERBS.has(folded) ||
  LEADING_VERBS.has(folded.replace(/e?[sd]$/, "")) ||
  (folded.endsWith("ing") && !ING_NOUNS.has(folded));
// Turkish verb forms: verbal nouns with a possessive ("uygulanması"), abilities
// ("yapabilen"), converbs ("kullanarak"), necessity and continuous forms
const TR_VERB =
  /(?:m[ae]si(?:n[iu]|n[ae]|nd[ae])?|[ae]bil[ei]n|[ae]bilecek|[ae]r[ae]k|m[ae]li|m[ae]m[ae]|m[ae]kte(?:dir)?|yor(?:um|uz|sunuz|lar|sa|saniz)?)$/;
// Participles of 7+ letters: "kullanılan", "belirlenen", "kullanan", "geliştirmiş". Shorter
// words keep "plan", "eleman"; the short participles (eden, veren) are in STOP.
const TR_PARTICIPLE = /^.{4,}(?:[iu]?[ln][ae]n|m[iu]s)$/;
// Light verbs end a run; other infinitives become nouns ("teklif hazırlamak" -> "hazırlama")
// prettier-ignore
const LIGHT_VERBS = words("yapmak etmek olmak bilmek kullanmak saglamak calismak vermek almak gostermek bulunmak tutmak gerekmek");
const INFINITIVE = /m[ae]k$/;
// Nouns the Turkish verb and case patterns above would misread: "mali tablo" (-mali),
// "yemek servisi" (-mek), "makine bakımı" (dative -ne), "ürün" (genitive -ün)
// prettier-ignore
const TR_NOUNS = ["mali", "mama", "yorum", "yemek", "ekmek", "kaymak", "cakmak", "makine", "medya", "kimya",
  "hane", "asya", "urun", "protein", "vitamin", "kadin"];
const isTrNoun = (folded: string) => isOneOf(folded, TR_NOUNS);
// A Turkish phrase ending in the genitive lost its head to a verb or a stop word:
// "Haftalık ders planlarının (hazırlanması)", "veri bütünlüğünün (sağlanması)"
const TR_GENITIVE = /(?:[iu]n|n[iu]n)$/;
// Ending in a possessive + locative/ablative it names a setting, not a skill:
// "spor merkezlerinde", "malzemeleri sektöründe", "benzer pozisyonda" ("hasta bakımında" stays)
const TR_SETTING = /(?:l[ae]r[iu]nd[ae]n?|sektorund[ae]n?|pozisyond[ae])$/;
// Plural + possessive + dative/accusative is a verb's object: "Office programlarına",
// "rakip bilgilerini (girmek)"
const TR_OBJECT = /l[ae]r[iu]n[aeiu]$/;
// A noun compound never puts a dative before its head: "satış hedeflerine ulaşma",
// "canlıya alma" are verb clauses
const TR_DATIVE = /(?:[aeiou]n[ae]|y[ae])$/;

// A phrase made only of these is not a skill ("ekip çalışması" is in the dictionary)
// prettier-ignore
const GENERIC = ["experience", "skill", "knowledge", "ability", "abilities", "team", "work", "environment",
  "role", "level", "candidate", "company", "position", "job", "people", "business", "time", "member", "task",
  "duties", "responsibilit", "field", "area", "deneyim", "bilgi", "beceri", "ekip", "is", "isler", "ortam",
  "pozisyon", "firma", "sirket", "calisma", "kisi", "konu", "sure", "gun", "saat", "seviye", "gorev",
  "sorumluluk"];
// Head nouns that only frame the skill: "enfeksiyon kontrolü prosedürleri" -> "enfeksiyon kontrolü"
// prettier-ignore
const FRAMES = ["skill", "abilities", "procedure", "process", "task", "activities", "kural", "standart",
  "prosedur", "surec", "calismalari", "islem", "becerileri", "faaliyet"];
// A phrase headed by a person is a role or an audience: "student nurses", "store manager"
// prettier-ignore
const PEOPLE = ["nurse", "manager", "trainer", "leader", "lead", "member", "staff", "employee", "assistant",
  "worker", "student", "stakeholder", "applicant", "guest", "families", "hire", "personel", "eleman", "uzman",
  "mudur", "yonetici", "sorumlusu", "temsilcisi", "hemsire", "ogrenci", "musteriler", "uyeleri"];
const isOneOf = (folded: string, list: string[]) =>
  list.some((word) => tokenMatches(folded, word));

// Turkish suffixes the tokenizer splits off after an apostrophe ("Yakası'nda", "SQL'den")
const SUFFIX_TOKENS = words(
  "nda nde ndan nden dan den tan ten nin nun yla yle dir dur lar ler"
);

const MAX_WORDS = 3;

const isStop = (token: string, isBoundary: (token: string) => boolean) => {
  const folded = foldText(token);
  return (
    folded.length < 3 || // also suffixes cut off at an apostrophe ("Excel'e")
    SUFFIX_TOKENS.has(folded) || // longer ones: "Yakası'nda"
    /\d/.test(folded) ||
    STOP.has(folded) ||
    EN_VERB_FORMS.has(folded) ||
    EN_IRREGULAR.has(folded) ||
    LIGHT_VERBS.has(folded) ||
    (TR_VERB.test(folded) && !isTrNoun(folded)) ||
    TR_PARTICIPLE.test(folded) ||
    isBoundary(token)
  );
};

/** Runs of words between stop words; an infinitive closes its run */
const toRuns = (
  tokens: string[],
  isBoundary: (token: string) => boolean,
  skipFirst: boolean
) => {
  const runs: string[][] = [[]];
  tokens.forEach((token, i) => {
    if ((skipFirst && i === 0) || isStop(token, isBoundary)) {
      runs.push([]);
      return;
    }
    runs[runs.length - 1].push(token);
    const folded = foldText(token);
    if (INFINITIVE.test(folded) && !isTrNoun(folded)) runs.push([]);
  });
  return runs.filter((run) => run.length >= 2);
};

const VOWEL_END = /[aeıioöuü]$/;
/**
 * The form a resume writes: case endings after a possessive ("planının" -> "planı",
 * "bakımına" -> "bakımı") or a bare locative ("bakımda" -> "bakım"). A stem of 5+
 * letters keeps "makine" and "ajanda".
 */
const stripTurkishCase = (word: string) => {
  const possessive = word.replace(
    /(?:n[ıiuü]n|n[ıiuü]|n[ae]|nd[ae]n?|yl[ae])$/,
    ""
  );
  if (
    possessive !== word &&
    possessive.length >= 5 &&
    VOWEL_END.test(possessive)
  ) {
    return possessive;
  }
  const locative = word.replace(/[dt][ae]n?$/, "");
  return locative !== word && locative.length >= 5 && !VOWEL_END.test(locative)
    ? locative
    : word;
};

const HARD: Record<string, string> = { b: "p", c: "ç", d: "t", ğ: "k" };
const hardened = (consonant: string) => HARD[consonant];

export interface PhraseCandidate {
  label: string; // the ad's wording
  key: string; // folded, last word stemmed, for merging repeats
  forms: string[]; // lowercase forms for toPhrase
}

const toCandidate = (
  run: string[],
  lang: Lang,
  covered: Set<string>
): PhraseCandidate | undefined => {
  let tokens = run;
  const lastOf = () => foldText(tokens[tokens.length - 1]);
  if (lang === "tr" && INFINITIVE.test(lastOf()) && !isTrNoun(lastOf())) {
    const last = tokens[tokens.length - 1].replace(/(m[ae])k$/i, "$1");
    tokens = [...tokens.slice(0, -1), last];
  }
  if (lang === "en" && isLeadingVerb(foldText(tokens[0]))) {
    tokens = tokens.slice(1);
    if (tokens.length < 2) return undefined;
  }
  // A frame marks the words before it as the skill, so one word may be left:
  // "hijyen kurallarına" -> "hijyen"
  let framed = false;
  while (tokens.length > 1 && isOneOf(lastOf(), FRAMES)) {
    tokens = tokens.slice(0, -1);
    framed = true;
  }
  // Longer runs keep their head: the last words
  tokens = tokens.slice(-MAX_WORDS);
  const folded = tokens.map(foldText);
  // All generic, or the dictionary already took every specific word. All words
  // capitalised is a name: "Naked Farmer", "Bilek Güreşi Federasyonu", "Flow Registry".
  if (
    (tokens.length < 2 && !framed) ||
    (lang === "tr" &&
      ((TR_GENITIVE.test(folded[folded.length - 1]) &&
        !TR_NOUNS.includes(folded[folded.length - 1])) ||
        TR_SETTING.test(folded[folded.length - 1]) ||
        TR_OBJECT.test(folded[folded.length - 1]) ||
        folded
          .slice(0, -1)
          .some((word) => TR_DATIVE.test(word) && !TR_NOUNS.includes(word)))) ||
    (tokens.length > 1 && tokens.every((word) => /^\p{Lu}/u.test(word))) ||
    (isOneOf(folded[folded.length - 1], PEOPLE) &&
      !ING_NOUNS.has(folded[folded.length - 1])) || // "staff" but not "staffing"
    folded
      .filter((word) => !isOneOf(word, GENERIC))
      .every((word) => covered.has(word))
  ) {
    return undefined;
  }
  const lower = tokens.map((t) => t.toLocaleLowerCase(lang));
  const head = lower.slice(0, -1);
  const last = lower[lower.length - 1];
  // Turkish: every word without its case ending ("öğrenci gelişiminin takibi" ->
  // "öğrenci gelişimi takib"), and a softened final consonant hardened ("takib" ->
  // "takip"), so "öğrenci gelişimini takip ettim" matches word by word
  const stems =
    lang === "tr"
      ? toTurkishCompoundStems(
          [...head, last].map(stripTurkishCase).join(" ")
        ).flatMap((form) => [form, form.replace(/[bcdğ]$/, hardened)])
      : [[...head, last.replace(/^(.{4,}[^su])s$/, "$1")].join(" ")];
  const forms = Array.from(new Set([lower.join(" "), ...stems]));
  const shortest = forms.reduce((a, b) => (b.length < a.length ? b : a));
  return { label: tokens.join(" "), key: foldText(shortest), forms };
};

// A hyphenated compound with a stop word in it ("high-profile", "end-to-end") is a
// modifier: the tokenizer would split it and leave "profile offsite events"
// Maximal runs of letters and hyphens: unlike /\p{L}+(?:-\p{L}+)+/ this cannot backtrack,
// which took seconds on one long letter-only token (security review, tur 4)
const withoutStopCompounds = (text: string) =>
  text.replace(/[\p{L}-]+/gu, (run) => {
    const parts = run.split("-").filter(Boolean);
    return parts.length > 1 && parts.some((part) => STOP.has(foldText(part)))
      ? ","
      : run;
  });

/**
 * Phrase candidates of one ad line. isBoundary marks tool tokens ("HBYS") as breaks;
 * covered holds the folded tokens of the line's dictionary matches. An English duty
 * line opens with its verb ("Track supplier performance"), which never starts a phrase.
 */
export const extractPhrases = (
  content: string,
  lang: Lang,
  isBoundary: (token: string) => boolean,
  covered: Set<string>,
  isDuty: boolean
): PhraseCandidate[] =>
  withoutStopCompounds(content)
    .split(/[,;:()[\]{}]|[.!?](?=\s|$)|\s[-–—|]\s/)
    .flatMap((item, i) =>
      toRuns(rawTokenize(item), isBoundary, isDuty && lang === "en" && i === 0)
    )
    .map((run) => toCandidate(run, lang, covered))
    .filter((c): c is PhraseCandidate => Boolean(c));
