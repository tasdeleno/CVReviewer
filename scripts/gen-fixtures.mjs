// Render the synthetic eval resumes (eval/<split>/<id>/<fit>.json) into PDFs next to them,
// so the eval runs the real PDF -> text items -> parser path.
// Usage: node scripts/gen-fixtures.mjs            (eval/dev + eval/holdout)
//        node scripts/gen-fixtures.mjs <dir>      (every *.json resume in <dir>)
import { createRequire } from "node:module";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const React = require("react");
const { Document, Page, Text, View, Font, StyleSheet, renderToFile } =
  require("@react-pdf/renderer");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const h = React.createElement;

// Roboto has Turkish glyphs; the bold font name contains "Bold", which the parser uses
Font.register({
  family: "Roboto",
  fonts: [
    { src: join(root, "public/fonts/Roboto-Regular.ttf") },
    { src: join(root, "public/fonts/Roboto-Bold.ttf"), fontWeight: "bold" },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 10, padding: 36, lineHeight: 1.3 },
  name: { fontSize: 18, fontWeight: "bold" },
  title: { fontSize: 11, fontWeight: "bold", marginTop: 10, marginBottom: 3 },
  bold: { fontWeight: "bold" },
  row: { flexDirection: "row" },
  left: { width: "32%", paddingRight: 14 },
  right: { width: "68%" },
  entry: { marginBottom: 6 },
});

const bullets = (items) => items.map((d, i) => h(Text, { key: i }, `• ${d}`));

const section = (cv, key, headings, children) => {
  if (!children.length) return null;
  const title = cv.sectionTitles?.[key];
  return h(View, { key }, headings && title ? h(Text, { style: s.title }, title) : null, ...children);
};

const blocks = (cv, headings) => ({
  summary: section(cv, "summary", headings, cv.profile.summary ? [h(Text, { key: "s" }, cv.profile.summary)] : []),
  workExperiences: section(cv, "workExperiences", headings, cv.workExperiences.map((w, i) =>
    h(View, { key: i, style: s.entry },
      h(Text, { style: s.bold }, w.company),
      h(Text, null, [w.jobTitle, w.date].filter(Boolean).join("   ")),
      ...bullets(w.descriptions)))),
  educations: section(cv, "educations", headings, cv.educations.map((e, i) =>
    h(View, { key: i, style: s.entry },
      h(Text, { style: s.bold }, e.school),
      h(Text, null, [e.degree, e.date, e.gpa && `GPA ${e.gpa}`].filter(Boolean).join("   ")),
      ...bullets(e.descriptions)))),
  projects: section(cv, "projects", headings, cv.projects.map((p, i) =>
    h(View, { key: i, style: s.entry },
      h(Text, { style: s.bold }, [p.project, p.date].filter(Boolean).join("   ")),
      ...bullets(p.descriptions)))),
  skills: section(cv, "skills", headings, bullets(cv.skills.descriptions)),
  custom: section(cv, "custom", headings, bullets(cv.custom.descriptions)),
});

const resumeDocument = (cv) => {
  const p = cv.profile;
  const contact = [p.email, p.phone, p.location, p.url].filter(Boolean);
  const header = [h(Text, { key: "n", style: s.name }, p.name)];
  const b = blocks(cv, cv.layout !== "no-headings");
  if (cv.layout === "two-column") {
    return h(Document, null, h(Page, { size: "A4", style: s.page },
      ...header,
      h(View, { style: s.row },
        h(View, { style: s.left }, ...contact.map((c, i) => h(Text, { key: i }, c)), b.skills, b.educations),
        h(View, { style: s.right }, b.summary, b.workExperiences, b.projects, b.custom))));
  }
  return h(Document, null, h(Page, { size: "A4", style: s.page },
    ...header,
    h(Text, null, contact.join(" | ")),
    b.summary, b.workExperiences, b.educations, b.projects, b.skills, b.custom));
};

let count = 0;
const customDir = process.argv[2];
if (customDir) {
  for (const file of readdirSync(customDir).filter((f) => f.endsWith(".json"))) {
    const cv = JSON.parse(readFileSync(join(customDir, file), "utf8"));
    await renderToFile(resumeDocument(cv), join(customDir, file.replace(/\.json$/, ".pdf")));
    count++;
  }
}
for (const split of customDir ? [] : ["dev", "holdout"]) {
  const splitDir = join(root, "eval", split);
  if (!existsSync(splitDir)) continue;
  for (const id of readdirSync(splitDir)) {
    for (const fit of ["strong", "medium", "weak"]) {
      const jsonPath = join(splitDir, id, `${fit}.json`);
      if (!existsSync(jsonPath)) continue;
      const cv = JSON.parse(readFileSync(jsonPath, "utf8"));
      await renderToFile(resumeDocument(cv), join(splitDir, id, `${fit}.pdf`));
      count++;
    }
  }
}
console.log(`gen-fixtures: ${count} PDF yazıldı`);
