import type { TextItems } from "lib/parse-resume-from-pdf/types";
import { groupTextItemsIntoLines } from "lib/parse-resume-from-pdf/group-text-items-into-lines";
import { groupLinesIntoSections } from "lib/parse-resume-from-pdf/group-lines-into-sections";
import { extractResumeFromSections } from "lib/parse-resume-from-pdf/extract-resume-from-sections";
import { checkConditions } from "lib/job-match/conditions";
import {
  extractJobAd,
  isInsufficient,
  type AdKeyword,
} from "lib/job-match/keywords";
import { checkAts, suggest } from "lib/job-match/suggest";
import {
  detectLang,
  hasPhrase,
  hasWords,
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
    // A phrase's words in any order within one line: "nursing care to patients" has
    // "patient care", "hastaların bakımı" has "hasta bakımı"
    const hasInLine = (text: TokenizedText) =>
      has(text) ||
      (keyword.kind === "phrase" &&
        keyword.phrases.some((phrase) => hasWords(text, phrase)));
    const sections = Array.from(
      new Set(
        lines.filter((line) => hasInLine(line.text)).map((line) => line.section)
      )
    );
    return {
      ...keyword,
      found: sections.length > 0 || hasInLine(whole),
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

// The longest of 572 corpus ads is 12.7k characters. At 100k a many-line input took 2–3 s
// on the main thread; at this cap it stays under a second.
export const MAX_INPUT_CHARS = 30_000;

export const resumeLength = (textItems: TextItems) =>
  textItems.reduce((sum, item) => sum + item.text.length, 0);

// Its own class: an engine bug can throw a RangeError too ("Invalid string length")
export class InputTooLongError extends RangeError {
  name = "InputTooLongError";
}

export const analyze = (jobAd: string, textItems: TextItems) => {
  if (
    jobAd.length > MAX_INPUT_CHARS ||
    resumeLength(textItems) > MAX_INPUT_CHARS
  ) {
    throw new InputTooLongError(
      `input longer than ${MAX_INPUT_CHARS} characters`
    );
  }
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
  const ad = extractJobAd(jobAd);
  const matches = matchKeywords(ad.keywords, resumeLines);
  // Too few skills in the ad: the score is shown flagged, not as a verdict
  const insufficient = isInsufficient(ad.keywords);
  return {
    score: computeScore(matches),
    insufficient,
    langs,
    matches,
    // not in the score: shown apart from the keywords (eval/README.md, conditions)
    conditions: checkConditions(ad.conditions, resumeText),
    ignored: ad.ignored,
    suggestions: suggest({
      jobAd,
      matches,
      resume,
      resumeText,
      langs,
      insufficient,
    }),
    ats: checkAts(textItems, resume),
    resume,
    sections,
  };
};

export type Analysis = ReturnType<typeof analyze>;
