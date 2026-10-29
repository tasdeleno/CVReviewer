import type { TextItems } from "lib/parse-resume-from-pdf/types";
import { groupTextItemsIntoLines } from "lib/parse-resume-from-pdf/group-text-items-into-lines";
import { groupLinesIntoSections } from "lib/parse-resume-from-pdf/group-lines-into-sections";
import { extractResumeFromSections } from "lib/parse-resume-from-pdf/extract-resume-from-sections";
import { extractKeywords, type AdKeyword } from "lib/job-match/keywords";
import { checkAts, suggest } from "lib/job-match/suggest";
import {
  detectLang,
  hasPhrase,
  toTokenizedText,
  type Lang,
  type TokenizedText,
} from "lib/job-match/text";

export interface KeywordMatch extends AdKeyword {
  found: boolean;
  // resume section titles where it was found ("profile" for the header), in resume order
  sections: string[];
}

export interface ResumeLine {
  section: string;
  text: string;
}

export const matchKeywords = (
  keywords: AdKeyword[],
  resumeLines: ResumeLine[]
): KeywordMatch[] => {
  const lines = resumeLines.map((line) => ({
    section: line.section,
    text: toTokenizedText(line.text),
  }));
  // Fallback for phrases broken across lines ("machine" / "learning")
  const whole = toTokenizedText(resumeLines.map((line) => line.text).join(" "));
  return keywords.map((keyword) => {
    const phrases = [...keyword.phrases, ...(keyword.skill?.impliedBy ?? [])];
    const has = (text: TokenizedText) =>
      phrases.some((phrase) => hasPhrase(text, phrase));
    const sections = Array.from(
      new Set(
        lines.filter((line) => has(line.text)).map((line) => line.section)
      )
    );
    return {
      ...keyword,
      found: sections.length > 0 || has(whole),
      sections,
    };
  });
};

/** Weighted share of ad keywords found in the resume, 0-100 */
export const computeScore = (matches: KeywordMatch[]) => {
  const total = matches.reduce((sum, match) => sum + match.weight, 0);
  if (total === 0) return 0;
  const found = matches
    .filter((match) => match.found)
    .reduce((sum, match) => sum + match.weight, 0);
  return Math.round((100 * found) / total);
};

export const analyze = (jobAd: string, textItems: TextItems) => {
  const lines = groupTextItemsIntoLines(textItems);
  const sections = groupLinesIntoSections(lines);
  const resume = extractResumeFromSections(sections);
  const resumeLines: ResumeLine[] = Object.entries(sections).flatMap(
    ([section, sectionLines]) =>
      sectionLines.map((line) => ({
        section,
        text: line.map((item) => item.text).join(" "),
      }))
  );
  const resumeText = resumeLines.map((line) => line.text).join("\n");
  const langs: { ad: Lang; resume: Lang } = {
    ad: detectLang(jobAd),
    resume: detectLang(resumeText),
  };
  const matches = matchKeywords(extractKeywords(jobAd), resumeLines);
  return {
    score: computeScore(matches),
    langs,
    matches,
    suggestions: suggest({ jobAd, matches, resume, resumeText, langs }),
    ats: checkAts(textItems, resume),
    resume,
    sections,
  };
};
