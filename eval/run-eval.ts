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
interface Gold {
  id: string;
  keywords: GoldKeyword[];
  resumes: Record<Fit, { present: string[]; missing: string[] }>;
  expectedSections: Record<Fit, string[]>;
}

const split = process.env.EVAL_SPLIT === "holdout" ? "holdout" : "dev";
const splitDir = join(__dirname, split);

const readTextItems = async (path: string) => {
  const data = new Uint8Array(readFileSync(path));
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  return readPdfDocument(pdf);
};

const goldForms = (gold: GoldKeyword) => [gold.term, ...gold.aliases];
const isSameKeyword = (keyword: AdKeyword, gold: GoldKeyword) => {
  const labelText = toTokenizedText(keyword.label);
  // Each gold form separately, so a phrase can't straddle two forms
  return goldForms(gold).some((form) => {
    const formText = toTokenizedText(form);
    return (
      keyword.phrases.some((phrase) => hasPhrase(formText, phrase)) ||
      hasPhrase(labelText, toPhrase(form))
    );
  });
};

const pct = (n: number, d: number) => (d === 0 ? 1 : n / d);

test(`eval ${split}`, async () => {
  let extractedTotal = 0;
  let extractedCorrect = 0;
  let goldTotal = 0;
  let goldExtracted = 0;
  let decisions = 0;
  let decisionsCorrect = 0;
  let rankPairs = 0;
  let rankCorrect = 0;
  let sectionsExpected = 0;
  let sectionsFound = 0;
  const report: string[] = [`# Eval raporu (${split})`, ""];

  for (const id of readdirSync(splitDir).sort()) {
    const dir = join(splitDir, id);
    const ad = readFileSync(join(dir, "ad.txt"), "utf8");
    const gold: Gold = JSON.parse(readFileSync(join(dir, "gold.json"), "utf8"));
    const scores = {} as Record<Fit, number>;
    report.push(`## ${id}`);

    for (const fit of FITS) {
      const result = analyze(ad, await readTextItems(join(dir, `${fit}.pdf`)));
      scores[fit] = result.score;

      if (fit === "strong") {
        // Keyword extraction quality (same for every resume of the ad)
        const spurious = result.matches.filter(
          (keyword) => !gold.keywords.some((gk) => isSameKeyword(keyword, gk))
        );
        const missed = gold.keywords.filter(
          (gk) => !result.matches.some((keyword) => isSameKeyword(keyword, gk))
        );
        extractedTotal += result.matches.length;
        extractedCorrect += result.matches.length - spurious.length;
        goldTotal += gold.keywords.length;
        goldExtracted += gold.keywords.length - missed.length;
        report.push(
          `- Çıkarılamayan gold: ${
            missed.map((gk) => gk.term).join(", ") || "-"
          }`,
          `- Fazladan çıkarılan: ${
            spurious.map((k) => k.label).join(", ") || "-"
          }`
        );
      }

      // Present/missing decisions, only for gold keywords the engine extracted
      const wrong: string[] = [];
      for (const gk of gold.keywords) {
        const keyword = result.matches.find((k) => isSameKeyword(k, gk));
        if (!keyword) continue;
        const truth = gold.resumes[fit].present.includes(gk.term);
        decisions++;
        if (keyword.found === truth) decisionsCorrect++;
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
      sectionsExpected += expected.length;
      sectionsFound += expected.length - missingSections.length;

      report.push(
        `- ${fit}: skor ${result.score}, dil ${result.langs.ad}/${
          result.langs.resume
        }; yanlış karar: ${wrong.join(", ") || "-"}; parse edilemeyen bölüm: ${
          missingSections.join(", ") || "-"
        }`
      );
    }

    const pairs: [Fit, Fit][] = [
      ["strong", "medium"],
      ["medium", "weak"],
      ["strong", "weak"],
    ];
    for (const [better, worse] of pairs) {
      rankPairs++;
      if (scores[better] > scores[worse]) rankCorrect++;
    }
    report.push("");
  }

  const precision = pct(extractedCorrect, extractedTotal);
  const recall = pct(goldExtracted, goldTotal);
  const f1 = (2 * precision * recall) / (precision + recall || 1);
  const decisionAccuracy = pct(decisionsCorrect, decisions);
  const rankAccuracy = pct(rankCorrect, rankPairs);
  const sectionRecall = pct(sectionsFound, sectionsExpected);
  const composite =
    100 *
    (0.35 * f1 +
      0.35 * decisionAccuracy +
      0.2 * rankAccuracy +
      0.1 * sectionRecall);

  const summary = [
    `Çıkarma: precision ${(100 * precision).toFixed(1)}, recall ${(
      100 * recall
    ).toFixed(1)}, F1 ${(100 * f1).toFixed(1)}`,
    `Var/eksik karar doğruluğu: ${(100 * decisionAccuracy).toFixed(
      1
    )} (${decisionsCorrect}/${decisions})`,
    `Sıralama doğruluğu: ${(100 * rankAccuracy).toFixed(
      1
    )} (${rankCorrect}/${rankPairs})`,
    `Bölüm parse oranı: ${(100 * sectionRecall).toFixed(
      1
    )} (${sectionsFound}/${sectionsExpected})`,
    `EVAL_SCORE=${composite.toFixed(1)}`,
  ];
  report.splice(2, 0, ...summary, "");
  writeFileSync(join(__dirname, `report-${split}.md`), report.join("\n"));
  console.log(summary.join("\n"));
}, 300000);
