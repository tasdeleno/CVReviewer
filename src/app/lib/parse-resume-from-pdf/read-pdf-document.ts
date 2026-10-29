import type {
  PDFDocumentProxy,
  TextItem as PdfjsTextItem,
} from "pdfjs-dist/types/src/display/api";
import type { TextItem, TextItems } from "lib/parse-resume-from-pdf/types";

/**
 * Convert a loaded pdfjs document into text items (see readPdf).
 *
 * Kept free of runtime pdfjs imports so it also runs in Node (eval scripts, tests)
 * with the pdfjs legacy build, while the browser loads pdfjs with its webpack worker.
 */
export const readPdfDocument = async (
  pdfFile: PDFDocumentProxy
): Promise<TextItems> => {
  let textItems: TextItems = [];

  for (let i = 1; i <= pdfFile.numPages; i++) {
    // Parse each page into text content
    const page = await pdfFile.getPage(i);
    const textContent = await page.getTextContent();

    // Wait for font data to be loaded
    await page.getOperatorList();
    const commonObjs = page.commonObjs;

    // Convert Pdfjs TextItem type to new TextItem type
    const pageTextItems = textContent.items.map((item) => {
      const {
        str: text,
        dir, // Remove text direction
        transform,
        fontName: pdfFontName,
        ...otherProps
      } = item as PdfjsTextItem;

      // Extract x, y position of text item from transform.
      // As a side note, origin (0, 0) is bottom left.
      // Reference: https://github.com/mozilla/pdf.js/issues/5643#issuecomment-496648719
      const x = transform[4];
      const y = transform[5];

      // Use commonObjs to convert font name to original name (e.g. "GVDLYI+Arial-BoldMT")
      // since non system font name by default is a loaded name, e.g. "g_d8_f1"
      // Reference: https://github.com/mozilla/pdf.js/pull/15659
      const fontObj = commonObjs.get(pdfFontName);
      const fontName = fontObj.name;

      // pdfjs reads a "-" as "-­‐" in the resume example. This is to revert it.
      // Note "-­‐" is "-&#x00AD;‐" with a soft hyphen in between. It is not the same as "--"
      const newText = text.replace(/-­‐/g, "-");

      const newItem = {
        ...otherProps,
        fontName,
        text: newText,
        x,
        y,
      };
      return newItem;
    });

    // Some pdf's text items are not in order. This is most likely a result of creating it
    // from design softwares, e.g. canvas. The commented out method can sort pageTextItems
    // by y position to put them back in order. But it is not used since it might be more
    // helpful to let users know that the pdf is not in order.
    // pageTextItems.sort((a, b) => Math.round(b.y) - Math.round(a.y));

    // Add text items of each page to total
    textItems.push(...pageTextItems);
  }

  // Filter out empty space textItem noise
  const isEmptySpace = (textItem: TextItem) =>
    !textItem.hasEOL && textItem.text.trim() === "";
  textItems = textItems.filter((textItem) => !isEmptySpace(textItem));

  return textItems;
};
