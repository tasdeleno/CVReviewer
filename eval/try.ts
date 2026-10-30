/**
 * @jest-environment node
 *
 * Try the engine on your own ads and resumes, outside the scored eval:
 *   TRY_DIR=<dir> npm run try
 * <dir>/ads/*.txt are job ads, <dir>/cvs/*.pdf resumes (render *.json with
 * `node scripts/gen-fixtures.mjs <dir>/cvs`). A resume's JSON may list "targets"
 * (ad file names without .txt) to get a full report for those pairs; every pair gets
 * a score in the matrix. Writes <dir>/report.md.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { readPdfDocument } from "lib/parse-resume-from-pdf/read-pdf-document";
import { analyze } from "lib/job-match";

// pdfjs legacy build only needs these for rendering, not for text extraction.
// required (not imported) so the globals exist before pdfjs loads
const g = globalThis as any;
g.DOMMatrix ??= class {};
g.Path2D ??= class {};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

const dir = process.env.TRY_DIR;

const readTextItems = async (path: string) => {
  const data = new Uint8Array(readFileSync(path));
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  return readPdfDocument(pdf);
};

const PRIORITY = { high: "🔴", medium: "🟡", low: "⚪" };

(dir ? test : test.skip)(
  "try",
  async () => {
    const adsDir = join(dir!, "ads");
    const cvsDir = join(dir!, "cvs");
    const ads = readdirSync(adsDir)
      .filter((f) => f.endsWith(".txt"))
      .map((f) => ({
        id: f.replace(/\.txt$/, ""),
        text: readFileSync(join(adsDir, f), "utf8"),
      }));
    const cvs = readdirSync(cvsDir)
      .filter((f) => f.endsWith(".pdf"))
      .map((f) => f.replace(/\.pdf$/, ""));

    const out: string[] = ["# Deneme raporu", "", "## Skor matrisi", ""];
    out.push(`| CV \\ İlan | ${ads.map((a) => a.id).join(" | ")} |`);
    out.push(`|---|${ads.map(() => "---").join("|")}|`);
    const details: string[] = [];

    for (const cv of cvs) {
      const textItems = await readTextItems(join(cvsDir, `${cv}.pdf`));
      const jsonPath = join(cvsDir, `${cv}.json`);
      const targets: string[] = existsSync(jsonPath)
        ? JSON.parse(readFileSync(jsonPath, "utf8")).targets ?? []
        : [];
      const row: string[] = [];
      for (const ad of ads) {
        const result = analyze(ad.text, textItems);
        row.push(
          result.insufficient
            ? `${result.score} (yetersiz)`
            : String(result.score)
        );
        if (!targets.includes(ad.id)) continue;

        const label = (m: (typeof result.matches)[number]) =>
          `${m.label}${m.importance === "required" ? "*" : ""}`;
        details.push(
          `## ${cv} × ${ad.id} — skor ${result.score}${
            result.insufficient ? " (yetersiz sinyal)" : ""
          }`,
          "",
          `Dil: ilan ${result.langs.ad}, CV ${result.langs.resume}. (* = zorunlu)`,
          "",
          `**Var (${result.matches.filter((m) => m.found).length}):** ${
            result.matches
              .filter((m) => m.found)
              .map(label)
              .join(", ") || "-"
          }`,
          "",
          `**Eksik (${result.matches.filter((m) => !m.found).length}):** ${
            result.matches
              .filter((m) => !m.found)
              .map(label)
              .join(", ") || "-"
          }`,
          "",
          `**İlan koşulları (skora girmez):** ${
            result.conditions
              .map(
                (c) =>
                  `${c.kind} (${c.tier}${
                    c.found === undefined
                      ? ""
                      : c.found
                      ? ", CV'de var"
                      : ", CV'de yok"
                  })`
              )
              .join(", ") || "-"
          }`,
          "",
          "**Öneriler:**",
          ...result.suggestions.flatMap((s) => [
            `- ${PRIORITY[s.priority]} [${s.section}] ${s.message}`,
            ...(s.examples ?? []).map((e) => `    - «${e}»`),
          ]),
          "",
          "**ATS:**",
          ...result.ats.map((a) => `- ${a.ok ? "✅" : "⚠️"} ${a.message}`),
          ""
        );
      }
      out.push(`| ${cv} | ${row.join(" | ")} |`);
    }

    const report = [...out, "", ...details].join("\n");
    writeFileSync(join(dir!, "report.md"), report);
    console.log(report);
  },
  300000
);
