import type { TextItem, FeatureSet } from "lib/parse-resume-from-pdf/types";

const isTextItemBold = (fontName: string) =>
  fontName.toLowerCase().includes("bold");
export const isBold = (item: TextItem) => isTextItemBold(item.fontName);
// \p{L} instead of [a-zA-Z] so Turkish letters (ç ğ ı İ ö ş ü) count as letters
export const hasLetter = (item: TextItem) => /\p{L}/u.test(item.text);
export const hasNumber = (item: TextItem) => /[0-9]/.test(item.text);
export const hasComma = (item: TextItem) => item.text.includes(",");
export const getHasText = (text: string) => (item: TextItem) =>
  item.text.includes(text);
export const hasOnlyLettersSpacesAmpersands = (item: TextItem) =>
  /^[\p{L}\s&]+$/u.test(item.text);
export const hasLetterAndIsAllUpperCase = (item: TextItem) =>
  hasLetter(item) && item.text.toUpperCase() === item.text;

// Date Features
const hasYear = (item: TextItem) => /(?:19|20)\d{2}/.test(item.text);
// prettier-ignore
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Turkish months match as whole words only: 4-char prefixes like "Mart" would hit "Martin"
// prettier-ignore
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const hasMonth = (item: TextItem) =>
  MONTHS.some(
    (month) =>
      item.text.includes(month) || item.text.includes(month.slice(0, 4))
  ) || item.text.split(/[^\p{L}]+/u).some((word) => TR_MONTHS.includes(word));
const SEASONS = ["Summer", "Fall", "Spring", "Winter"];
const hasSeason = (item: TextItem) =>
  SEASONS.some((season) => item.text.includes(season));
const PRESENT = ["Present", "Halen", "Günümüz", "Devam"];
const hasPresent = (item: TextItem) =>
  PRESENT.some((present) => item.text.includes(present));
export const DATE_FEATURE_SETS: FeatureSet[] = [
  [hasYear, 1],
  [hasMonth, 1],
  [hasSeason, 1],
  [hasPresent, 1],
  [hasComma, -1],
];
