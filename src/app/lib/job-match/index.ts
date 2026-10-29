import type { TextItems } from "lib/parse-resume-from-pdf/types";
import { groupTextItemsIntoLines } from "lib/parse-resume-from-pdf/group-text-items-into-lines";
import { groupLinesIntoSections } from "lib/parse-resume-from-pdf/group-lines-into-sections";
import { extractResumeFromSections } from "lib/parse-resume-from-pdf/extract-resume-from-sections";
import { extractKeywords, type AdKeyword } from "lib/job-match/keywords";
import {
  detectLang,
  hasPhrase,
  toTokenizedText,
  type Lang,
  type TokenizedText,
} from "lib/job-match/text";

export interface KeywordMatch extends AdKeyword {
  found: boolean;
  section?: string; // resume section title where it was found ("profile" for the header)
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
    const hit = lines.find((line) => has(line.text));
    return {
      ...keyword,
      found: Boolean(hit) || has(whole),
      section: hit?.section,
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
  const langs: { ad: Lang; resume: Lang } = {
    ad: detectLang(jobAd),
    resume: detectLang(resumeLines.map((line) => line.text).join("\n")),
  };
  const matches = matchKeywords(extractKeywords(jobAd), resumeLines);
  return {
    score: computeScore(matches),
    langs,
    matches,
    resume,
    sections,
  };
};
