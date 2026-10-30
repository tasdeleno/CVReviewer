/**
 * @jest-environment node
 *
 * Eval runner: scores the job-match engine against the synthetic corpus in eval/<split>.
 * Run with `npm run eval` (dev split) or `EVAL_SPLIT=holdout npm run eval`.
 * Prints one machine-readable line `EVAL_SCORE=<0-100>` and writes eval/report-<split>.md.
 */
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { readPdfDocument } from "lib/parse-resume-from-pdf/read-pdf-document";
import { analyze } from "lib/job-match";
import { hasPhrase, toPhrase, toTokenizedText } from "lib/job-match/text";
import type { AdKeyword } from "lib/job-match/keywords";
import { CONDITION_KINDS, type ConditionKind } from "lib/job-match/conditions";
import type { SuggestionKind } from "lib/job-match/suggest";

// pdfjs legacy build only needs these for rendering, not for text extraction.
// required (not imported) so the globals exist before pdfjs loads
const g = globalThis as any;
g.DOMMatrix ??= class {};
g.Path2D ??= class {};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

const FITS = ["strong", "medium", "weak"] as const;
type Fit = (typeof FITS)[number];
interface GoldKeyword {
  term: string;
  aliases: string[];
  importance: "required" | "preferred";
}
type Lang = "en" | "tr";
const LANGS: Lang[] = ["en", "tr"];
interface Gold {
  id: string;
  lang: Lang;
  keywords: GoldKeyword[];
  resumes: Record<Fit, { present: string[]; missing: string[] }>;
  expectedSections: Record<Fit, string[]>;
  expectedSuggestions: Record<Fit, SuggestionKind[]>;
  conditions?: { kind: ConditionKind }[]; // missing: the ad has no conditions
}

// Suggestion kinds labeled in gold (see eval/README.md). Keyword-driven kinds are left
// out: present/missing accuracy already measures them.
const MEASURED_KINDS: SuggestionKind[] = [
  "no-summary",
  "title",
  "weak-verbs",
  "unquantified",
  "long-bullets",
  "only-in-skills",
];
// Kinds that compare the resume with the ad's language; not measured on a cross-language
// resume, since an ad and its resume always share a language (eval/README.md)
const LANG_KINDS: SuggestionKind[] = ["title", "only-in-skills"];
// Same order as keywords.ts; typed so a new importance level fails to compile here
const IMPORTANCE_RANK: Record<AdKeyword["importance"], number> = {
  preferred: 0,
  normal: 1,
  required: 2,
};

const split = process.env.EVAL_SPLIT === "holdout" ? "holdout" : "dev";
const splitDir = join(__dirname, split);

const readTextItems = async (path: string) => {
  const data = new Uint8Array(readFileSync(path));
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  return readPdfDocument(pdf);
};

const goldForms = (gold: GoldKeyword) => [gold.term, ...gold.aliases];
const isSameKeyword = (
  keyword: AdKeyword,
  gold: GoldKeyword,
  whole: boolean
) => {
  const labelText = toTokenizedText(keyword.label);
  // Each gold form separately, so a phrase can't straddle two forms
  return goldForms(gold).some((form) => {
    const formText = toTokenizedText(form);
    return (
      keyword.phrases.some(
        (phrase) =>
          (!whole || phrase.tokens.length === formText.folded.length) &&
          hasPhrase(formText, phrase)
      ) || hasPhrase(labelText, toPhrase(form))
    );
  });
};

/**
 * Gold keywords an engine keyword stands for: those it names as a whole form, else those
 * that merely contain it ("Leadership" for "team leadership"). So "Excel" maps to the gold
 * Excel only, not also to VBA through its alias "Excel macros".
 */
const linkGolds = (keyword: AdKeyword, golds: GoldKeyword[]) => {
  const whole = golds.filter((gk) => isSameKeyword(keyword, gk, true));
  return whole.length
    ? whole
    : golds.filter((gk) => isSameKeyword(keyword, gk, false));
};

/** present/missing must split the gold terms exactly, or decisions are silently skewed */
const checkGold = (gold: Gold) => {
  if (!LANGS.includes(gold.lang)) throw new Error(`${gold.id}: lang geçersiz`);
  const terms = gold.keywords.map((gk) => gk.term).sort();
  for (const fit of FITS) {
    const { present, missing } = gold.resumes[fit];
    const split = [...present, ...missing].sort();
    if (JSON.stringify(split) !== JSON.stringify(terms)) {
      throw new Error(
        `${gold.id}/${fit}: present+missing gold terimlerini tam bölmüyor`
      );
    }
    // Hand-written JSON: guard the shape the type promises; a duplicate would count twice
    const kinds = gold.expectedSuggestions?.[fit];
    if (
      !Array.isArray(kinds) ||
      new Set(kinds).size !== kinds.length ||
      kinds.some((kind) => !MEASURED_KINDS.includes(kind))
    ) {
      throw new Error(
        `${gold.id}/${fit}: expectedSuggestions eksik ya da geçersiz`
      );
    }
  }
  const known: string[] = CONDITION_KINDS.map(([kind]) => kind);
  const conditions: unknown = gold.conditions ?? [];
  if (!Array.isArray(conditions)) {
    throw new Error(`${gold.id}: conditions geçersiz`);
  }
  const conditionKinds = conditions.map((c) => c?.kind);
  if (
    new Set(conditionKinds).size !== conditionKinds.length ||
    conditionKinds.some((kind) => !known.includes(kind))
  ) {
    throw new Error(`${gold.id}: conditions geçersiz`);
  }
};

const pct = (n: number, d: number) => (d === 0 ? 1 : n / d);
const show = (n: number, d: number) =>
  d === 0 ? "ölçülemedi" : ((100 * n) / d).toFixed(1);

// prettier-ignore
const COUNT_KEYS = ["extractedTotal", "extractedCorrect", "goldTotal", "goldExtracted",
  "decisions", "decisionsCorrect", "rankPairs", "rankCorrect", "sectionsExpected",
  "sectionsFound", "importanceTotal", "importanceCorrect", "suggestTp", "suggestFp",
  "suggestFn", "conditionTp", "conditionFp", "conditionFn", "phraseTotal", "phraseCorrect",
  "goldByPhraseOnly", "phraseDecisions", "phraseDecisionsCorrect"] as const;
type Counts = Record<(typeof COUNT_KEYS)[number], number>;
const sumCounts = (list: Counts[]) => {
  const total = Object.fromEntries(COUNT_KEYS.map((k) => [k, 0])) as Counts;
  for (const c of list) COUNT_KEYS.forEach((k) => (total[k] += c[k]));
  return total;
};

const metrics = (t: Counts) => {
  const precision = pct(t.extractedCorrect, t.extractedTotal);
  const recall = pct(t.goldExtracted, t.goldTotal);
  const f1 = (2 * precision * recall) / (precision + recall || 1);
  const decisionAccuracy = pct(t.decisionsCorrect, t.decisions);
  const rankAccuracy = pct(t.rankCorrect, t.rankPairs);
  const sectionRecall = pct(t.sectionsFound, t.sectionsExpected);
  const importanceAccuracy = pct(t.importanceCorrect, t.importanceTotal);
  const suggestPrecision = pct(t.suggestTp, t.suggestTp + t.suggestFp);
  const suggestRecall = pct(t.suggestTp, t.suggestTp + t.suggestFn);
  const suggestF1 =
    (2 * suggestPrecision * suggestRecall) /
    (suggestPrecision + suggestRecall || 1);
  // Ranking and section parsing sit near 100%, so they weigh less than the new parts.
  // A part with nothing to measure drops out and the rest are renormalized.
  const parts: [weight: number, value: number, denominator: number][] = [
    [0.3, f1, t.extractedTotal + t.goldTotal],
    [0.3, decisionAccuracy, t.decisions],
    [0.1, rankAccuracy, t.rankPairs],
    [0.05, sectionRecall, t.sectionsExpected],
    [0.1, importanceAccuracy, t.importanceTotal],
    [0.15, suggestF1, t.suggestTp + t.suggestFp + t.suggestFn],
  ];
  const measured = parts.filter(([, , d]) => d > 0);
  const composite =
    (100 * measured.reduce((sum, [w, v]) => sum + w * v, 0)) /
    (measured.reduce((sum, [w]) => sum + w, 0) || 1);
  return {
    precision,
    recall,
    f1,
    decisionAccuracy,
    rankAccuracy,
    sectionRecall,
    importanceAccuracy,
    suggestPrecision,
    suggestRecall,
    suggestF1,
    composite,
  };
};

/**
 * 90% interval of EVAL_SCORE, resampling ads with replacement. The ad is the unit: its
 * three resumes share its keywords, so they are not independent. Seeded, so reruns agree.
 */
const bootstrapInterval = (perAd: Counts[], rounds = 1000) => {
  let seed = 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const scores = Array.from(
    { length: rounds },
    () =>
      metrics(
        sumCounts(perAd.map(() => perAd[Math.floor(rand() * perAd.length)]))
      ).composite
  ).sort((a, b) => a - b);
  return [
    scores[Math.floor(rounds * 0.05)],
    scores[Math.ceil(rounds * 0.95) - 1],
  ];
};

test(`eval ${split}`, async () => {
  const perAd: Counts[] = [];
  const report: string[] = [`# Eval raporu (${split})`, ""];
  // EVAL_DUMP=<path>: per-resume matches, to rescore other weights offline
  const dump: unknown[] = [];

  // Ad folders only: the split also holds notes (holdout/SOURCES.md)
  const ids = readdirSync(splitDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  expect(ids.length).toBeGreaterThan(0);
  let crossLang = 0;
  let insufficientAds = 0;
  for (const id of ids) {
    const dir = join(splitDir, id);
    const ad = readFileSync(join(dir, "ad.txt"), "utf8");
    const gold: Gold = JSON.parse(readFileSync(join(dir, "gold.json"), "utf8"));
    checkGold(gold);
    const c = sumCounts([]);
    perAd.push(c);
    const scores: Partial<Record<Fit, number>> = {};
    let insufficient = false; // same for every resume of the ad
    report.push(`## ${id}`);

    for (const fit of FITS) {
      const result = analyze(ad, await readTextItems(join(dir, `${fit}.pdf`)));
      const resumeLang: unknown = JSON.parse(
        readFileSync(join(dir, `${fit}.json`), "utf8")
      ).lang;
      if (!LANGS.includes(resumeLang as Lang)) {
        throw new Error(`${id}/${fit}: CV lang geçersiz`);
      }
      // Only same-language resumes are judged on keywords (eval/README.md)
      const measured = resumeLang === gold.lang;
      if (!measured) crossLang++;
      dump.push({
        id,
        fit,
        measured,
        score: result.score,
        matches: result.matches.map((m) => ({
          label: m.label,
          kind: m.kind,
          importance: m.importance,
          found: m.found,
          category: m.skill?.category ?? null,
        })),
      });
      if (measured) scores[fit] = result.score;
      insufficient = result.insufficient;
      const links = result.matches.map((keyword) =>
        linkGolds(keyword, gold.keywords)
      );

      if (fit === "strong") {
        // Keyword extraction quality (same for every resume of the ad)
        const spurious = result.matches.filter((_, i) => !links[i].length);
        const missed = gold.keywords.filter(
          (gk) => !links.some((golds) => golds.includes(gk))
        );
        c.extractedTotal += result.matches.length;
        c.extractedCorrect += result.matches.length - spurious.length;
        c.goldTotal += gold.keywords.length;
        c.goldExtracted += gold.keywords.length - missed.length;
        // Phrases outside the dictionary, reported apart (not in EVAL_SCORE)
        const isPhrase = (i: number) => result.matches[i].kind === "phrase";
        result.matches.forEach((_, i) => {
          if (!isPhrase(i)) return;
          c.phraseTotal++;
          if (links[i].length) c.phraseCorrect++;
        });
        c.goldByPhraseOnly += gold.keywords.filter((gk) => {
          const by = links.flatMap((golds, i) =>
            golds.includes(gk) ? [i] : []
          );
          return by.length > 0 && by.every(isPhrase);
        }).length;

        // Importance: gold only says required or preferred, so the engine's "normal"
        // (responsibilities, intro) counts as not preferred. Several linked keywords:
        // the strongest wins, as when the engine merges duplicates.
        const wrongImportance: string[] = [];
        for (const gk of gold.keywords) {
          const linked = result.matches.filter((_, i) => links[i].includes(gk));
          if (!linked.length) continue;
          const importance = linked
            .map((k) => k.importance)
            .reduce((a, b) =>
              IMPORTANCE_RANK[a] >= IMPORTANCE_RANK[b] ? a : b
            );
          c.importanceTotal++;
          if (
            (importance === "preferred") ===
            (gk.importance === "preferred")
          ) {
            c.importanceCorrect++;
          } else {
            wrongImportance.push(
              `${gk.term} (gold ${gk.importance}, motor ${importance})`
            );
          }
        }
        report.push(
          `- Çıkarılamayan gold: ${
            missed.map((gk) => gk.term).join(", ") || "-"
          }`,
          `- Fazladan çıkarılan: ${
            spurious.map((k) => k.label).join(", ") || "-"
          }`,
          `- Yanlış önem: ${wrongImportance.join(", ") || "-"}`
        );

        // Conditions, per ad; reported apart, not in EVAL_SCORE (eval/README.md)
        const predictedConditions = result.conditions.map((c) => c.kind);
        const goldConditions = (gold.conditions ?? []).map((c) => c.kind);
        const extraConditions = predictedConditions.filter(
          (kind) => !goldConditions.includes(kind)
        );
        const missedConditions = goldConditions.filter(
          (kind) => !predictedConditions.includes(kind)
        );
        c.conditionTp += predictedConditions.length - extraConditions.length;
        c.conditionFp += extraConditions.length;
        c.conditionFn += missedConditions.length;
        report.push(
          `- Koşul: bulunamayan ${
            missedConditions.join(", ") || "-"
          }; fazladan ${extraConditions.join(", ") || "-"}`
        );
      }

      // Suggestion kinds against the labeled ones
      const isMeasuredKind = (kind: SuggestionKind) =>
        MEASURED_KINDS.includes(kind) &&
        (measured || !LANG_KINDS.includes(kind));
      const predicted = new Set(
        result.suggestions.map((s) => s.kind).filter(isMeasuredKind)
      );
      const expectedKinds =
        gold.expectedSuggestions[fit].filter(isMeasuredKind);
      const unexpected = Array.from(predicted).filter(
        (kind) => !expectedKinds.includes(kind)
      );
      const notGiven = expectedKinds.filter((kind) => !predicted.has(kind));
      c.suggestTp += predicted.size - unexpected.length;
      c.suggestFp += unexpected.length;
      c.suggestFn += notGiven.length;

      // Present/missing decisions, only for gold keywords the engine extracted. One gold
      // term can map to several engine keywords ("CPA/ACCA"): present if any was found.
      const wrong: string[] = [];
      for (const gk of measured ? gold.keywords : []) {
        const linked = result.matches.filter((_, i) => links[i].includes(gk));
        if (!linked.length) continue;
        const truth = gold.resumes[fit].present.includes(gk.term);
        const correct = linked.some((k) => k.found) === truth;
        c.decisions++;
        if (linked.every((k) => k.kind === "phrase")) {
          c.phraseDecisions++;
          if (correct) c.phraseDecisionsCorrect++;
        }
        if (correct) c.decisionsCorrect++;
        else
          wrong.push(
            `${gk.term} (${truth ? "var ama bulunamadı" : "yok ama bulundu"})`
          );
      }

      const parsed: Record<string, boolean> = {
        summary: Boolean(result.resume.profile.summary),
        workExperiences: result.resume.workExperiences.length > 0,
        educations: result.resume.educations.length > 0,
        projects: result.resume.projects.length > 0,
        skills: result.resume.skills.descriptions.length > 0,
      };
      const expected = gold.expectedSections[fit] ?? [];
      const missingSections = expected.filter((section) => !parsed[section]);
      c.sectionsExpected += expected.length;
      c.sectionsFound += expected.length - missingSections.length;

      report.push(
        `- ${fit}: skor ${result.score}, dil ${result.langs.ad}/${
          result.langs.resume
        }${
          measured ? "" : " (çapraz dil: karar ve skor ölçülmedi)"
        }; yanlış karar: ${wrong.join(", ") || "-"}; parse edilemeyen bölüm: ${
          missingSections.join(", ") || "-"
        }; beklenen ama çıkmayan öneri: ${
          notGiven.join(", ") || "-"
        }; fazladan öneri: ${unexpected.join(", ") || "-"}`
      );
    }

    const pairs: [Fit, Fit][] = [
      ["strong", "medium"],
      ["medium", "weak"],
      ["strong", "weak"],
    ];
    // A flagged score is not a verdict, so its order is not measured
    if (insufficient) {
      insufficientAds++;
      report.push("- Yetersiz sinyal: sıralama ölçülmedi");
    }
    // A pair counts only when both resumes were measured
    for (const [better, worse] of insufficient ? [] : pairs) {
      const [b, w] = [scores[better], scores[worse]];
      if (b === undefined || w === undefined) continue;
      c.rankPairs++;
      if (b > w) c.rankCorrect++;
    }
    report.push("");
  }

  const total = sumCounts(perAd);
  const {
    extractedCorrect,
    extractedTotal,
    goldExtracted,
    goldTotal,
    suggestTp,
    suggestFp,
    suggestFn,
    phraseTotal,
    phraseCorrect,
    goldByPhraseOnly,
    phraseDecisions,
    phraseDecisionsCorrect,
    decisionsCorrect,
    decisions,
    rankCorrect,
    rankPairs,
    sectionsFound,
    sectionsExpected,
    importanceCorrect,
    importanceTotal,
    conditionTp,
    conditionFp,
    conditionFn,
  } = total;
  const { f1, suggestF1, composite } = metrics(total);
  const [low, high] = bootstrapInterval(perAd);
  const suggestAll = suggestTp + suggestFp + suggestFn;

  const summary = [
    `Çıkarma: precision ${show(
      extractedCorrect,
      extractedTotal
    )}, recall ${show(goldExtracted, goldTotal)}, F1 ${show(
      f1,
      extractedTotal + goldTotal && 1
    )}`,
    `Var/eksik karar doğruluğu: ${show(
      decisionsCorrect,
      decisions
    )} (${decisionsCorrect}/${decisions})`,
    `Sıralama doğruluğu: ${show(
      rankCorrect,
      rankPairs
    )} (${rankCorrect}/${rankPairs})`,
    `Bölüm parse oranı: ${show(
      sectionsFound,
      sectionsExpected
    )} (${sectionsFound}/${sectionsExpected})`,
    `Önem doğruluğu: ${show(
      importanceCorrect,
      importanceTotal
    )} (${importanceCorrect}/${importanceTotal})`,
    `Öneri: precision ${show(suggestTp, suggestTp + suggestFp)}, recall ${show(
      suggestTp,
      suggestTp + suggestFn
    )}, F1 ${show(suggestF1, suggestAll && 1)}`,
    `Koşul (skora girmez): precision ${show(
      conditionTp,
      conditionTp + conditionFp
    )}, recall ${show(
      conditionTp,
      conditionTp + conditionFn
    )} (${conditionTp} doğru, ${conditionFp} fazladan, ${conditionFn} eksik)`,
    `İfade (skora girmez): ${phraseTotal} çıkarıldı, precision ${show(
      phraseCorrect,
      phraseTotal
    )}; yalnız ifadeyle bulunan gold ${goldByPhraseOnly}; karar doğruluğu ${show(
      phraseDecisionsCorrect,
      phraseDecisions
    )} (${phraseDecisionsCorrect}/${phraseDecisions})`,
    `Ölçülmeyen: ${crossLang} çapraz dil CV, ${insufficientAds} yetersiz ilan`,
    `Güven aralığı (%90, ${
      perAd.length
    } ilan üzerinde bootstrap): ${low.toFixed(1)}–${high.toFixed(1)}`,
    `EVAL_SCORE=${composite.toFixed(1)}`,
  ];
  report.splice(2, 0, ...summary, "");
  writeFileSync(join(__dirname, `report-${split}.md`), report.join("\n"));
  if (process.env.EVAL_DUMP) {
    writeFileSync(process.env.EVAL_DUMP, JSON.stringify(dump, null, 1));
  }
  console.log(summary.join("\n"));
}, 300000);
