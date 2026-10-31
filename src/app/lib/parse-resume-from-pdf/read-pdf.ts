// Getting pdfjs to work is tricky. The following 3 lines would make it work
// https://stackoverflow.com/a/63486898/7699841
import * as pdfjs from "pdfjs-dist";
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import type { TextItems } from "lib/parse-resume-from-pdf/types";
import { readPdfDocument } from "lib/parse-resume-from-pdf/read-pdf-document";

/**
 * Step 1: Read pdf and output textItems by concatenating results from each page.
 *
 * To make processing easier, it returns a new TextItem type, which removes unused
 * attributes (dir, transform), adds x and y positions, and replaces loaded font
 * name with original font name.
 *
 * @example
 * const onFileChange = async (e) => {
 *     const fileUrl = URL.createObjectURL(e.target.files[0]);
 *     const textItems = await readPdf(fileUrl);
 * }
 */
// A resume is 1–3 pages; past this it is not a resume and text extraction gets slow
export const MAX_PDF_PAGES = 10;

export class PdfTooLongError extends RangeError {
  name = "PdfTooLongError";
}

/** Rejects with pdfjs's PasswordException for encrypted files, PdfTooLongError past MAX_PDF_PAGES */
export const readPdf = async (fileUrl: string): Promise<TextItems> => {
  // isEvalSupported: false mitigates CVE-2024-4367 (arbitrary JS via crafted font) on pdfjs-dist < 4.2.67
  const pdfFile = await pdfjs.getDocument({
    url: fileUrl,
    isEvalSupported: false,
  }).promise;
  try {
    if (pdfFile.numPages > MAX_PDF_PAGES) {
      throw new PdfTooLongError(`PDF has more than ${MAX_PDF_PAGES} pages`);
    }
    return await readPdfDocument(pdfFile);
  } finally {
    pdfFile.destroy().catch(() => {}); // cleanup only; the read's own outcome stands
  }
};
