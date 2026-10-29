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
export const readPdf = async (fileUrl: string): Promise<TextItems> => {
  // isEvalSupported: false mitigates CVE-2024-4367 (arbitrary JS via crafted font) on pdfjs-dist < 4.2.67
  const pdfFile = await pdfjs.getDocument({
    url: fileUrl,
    isEvalSupported: false,
  }).promise;
  return readPdfDocument(pdfFile);
};
