import type { ResumeSectionToLines } from "lib/parse-resume-from-pdf/types";
import { foldText } from "lib/fold-text";

/**
 * Return section lines that contain any of the keywords.
 * Keywords must be in folded form (see foldText), e.g. "egitim" not "Eğitim".
 */
export const getSectionLinesByKeywords = (
  sections: ResumeSectionToLines,
  keywords: string[]
) => {
  for (const sectionName in sections) {
    const hasKeyWord = keywords.some((keyword) =>
      foldText(sectionName).includes(keyword)
    );
    if (hasKeyWord) {
      return sections[sectionName];
    }
  }
  return [];
};
