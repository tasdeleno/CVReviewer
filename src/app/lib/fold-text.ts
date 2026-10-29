/**
 * Case- and diacritic-insensitive form of a text for matching English and Turkish
 * text with the same rules, e.g. "İŞ DENEYİMİ" -> "is deneyimi", "Skills" -> "skills".
 *
 * Plain toLowerCase() turns "İ" into "i̇" (i + combining dot) and toLocaleLowerCase("tr-TR")
 * turns English "I" into "ı", so dotted/dotless i variants are all mapped to "i" first.
 */
export const foldText = (text: string): string =>
  text
    .replace(/[İIı]/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, ""); // drop combining marks left by NFD (ğ -> g, ş -> s, é -> e)
