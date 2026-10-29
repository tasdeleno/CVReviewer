import { foldText } from "lib/fold-text";

export type Lang = "en" | "tr";

// A loop, since /\.+$/ is quadratic on long runs of dots inside a token ("a....b")
const trimTrailingDots = (token: string) => {
  let end = token.length;
  while (end > 0 && token[end - 1] === ".") end--;
  return token.slice(0, end);
};

/**
 * Split text into tokens, keeping original case. Keeps tech tokens like "C++", "C#",
 * "Node.js", ".NET" together; splits on apostrophes and hyphens so "Python'da" ->
 * ["Python", "da"].
 */
export const rawTokenize = (text: string): string[] =>
  (text.normalize("NFC").match(/\.?[\p{L}\p{N}][\p{L}\p{N}+#.]*/gu) ?? []).map(
    trimTrailingDots
  );

/** Folded tokens (see foldText), aligned with rawTokenize */
export const tokenize = (text: string): string[] =>
  rawTokenize(text).map(foldText);

/** Text prepared for phrase lookup: raw tokens for case-sensitive forms, folded for the rest */
export interface TokenizedText {
  raw: string[];
  folded: string[];
}
export const toTokenizedText = (text: string): TokenizedText => {
  const raw = rawTokenize(text);
  return { raw, folded: raw.map(foldText) };
};

/**
 * A keyword form. Case-sensitive forms are for skill names that are also common words
 * ("React" vs "react to", "Excel" vs "excel at") and match only exactly as written.
 */
export interface Phrase {
  tokens: string[];
  caseSensitive: boolean;
  // Turkish writes suffixes on proper nouns/acronyms after an apostrophe ("SQL'i"), which
  // the tokenizer splits off. Lowercase common words take chains of attached Turkish
  // suffixes; proper nouns only a single one, as in sloppy "Pythonda" / "Dockerla", so
  // that "sql" + "i" + "te" does not match "SQLite".
  turkishSuffixes: boolean;
}
export const toPhrase = (form: string): Phrase =>
  form.startsWith("=")
    ? {
        tokens: rawTokenize(form.slice(1)),
        caseSensitive: true,
        turkishSuffixes: false,
      }
    : {
        tokens: tokenize(form),
        caseSensitive: false,
        turkishSuffixes: /^\p{Ll}/u.test(form.trim()),
      };

export const hasPhrase = (text: TokenizedText, phrase: Phrase) =>
  phrase.caseSensitive
    ? findPhrase(text.raw, phrase.tokens, true) !== -1
    : findPhrase(text.folded, phrase.tokens, false, phrase.turkishSuffixes) !==
      -1;

// Function words only, used for language detection
// prettier-ignore
const EN_FUNCTION_WORDS = new Set(["the", "and", "of", "to", "in", "for", "with", "is", "are", "you", "we", "our", "will", "on", "as", "an", "be", "your", "this", "that"]);
// prettier-ignore
const TR_FUNCTION_WORDS = new Set(["ve", "bir", "ile", "icin", "bu", "olarak", "olan", "da", "de", "veya", "gibi", "cok", "daha", "ise", "en", "az", "olmak", "uzere", "sahip", "konusunda"]);
const TR_LETTERS = /[çğıöşüÇĞİÖŞÜ]/g;

export const detectLang = (text: string): Lang => {
  let en = 0;
  let tr = (text.match(TR_LETTERS) ?? []).length / 4;
  for (const token of tokenize(text)) {
    if (EN_FUNCTION_WORDS.has(token)) en++;
    if (TR_FUNCTION_WORDS.has(token)) tr++;
  }
  return tr > en ? "tr" : "en";
};

// Inflection suffixes a keyword may carry and still count as a match.
// ponytail: suffix allow-list instead of a real stemmer; upgrade to a Snowball Turkish
// stemmer if eval shows too many misses on inflected forms.
// prettier-ignore
const EN_SUFFIXES = ["s", "es", "ed", "d", "ing", "er", "ers", "ment", "ments"];
// Folded Turkish suffixes (vowel harmony collapses after folding: ı->i, ü->u)
// prettier-ignore
const TR_SUFFIXES = ["lar", "ler", "da", "de", "ta", "te", "dan", "den", "tan", "ten", "nda", "nde", "ndan", "nden",
  "la", "le", "yla", "yle", "i", "u", "yi", "yu", "in", "un", "nin", "nun", "si", "su", "ya", "ye", "a", "e",
  "na", "ne", "ni", "nu", "ki", "li", "lu", "lik", "luk", "ci", "cu", "im", "um", "imiz", "umuz", "iz", "uz", "m"];
const ALL_SUFFIXES = [...EN_SUFFIXES, ...TR_SUFFIXES];

/** True if rest (what follows the keyword inside a token) is a chain of up to 3 suffixes */
const isSuffixChain = (
  rest: string,
  suffixes: string[],
  depth = 0
): boolean => {
  if (rest === "") return true;
  if (depth === 3) return false;
  return suffixes.some(
    (suffix) =>
      rest.startsWith(suffix) &&
      isSuffixChain(rest.slice(suffix.length), suffixes, depth + 1)
  );
};

/**
 * Token-level match: exact, or keyword token + inflection suffixes. English suffixes need a
 * 3+ char keyword token, Turkish ones 4+ (else "tax" + "i" matches "taxi").
 */
export const tokenMatches = (
  token: string,
  keywordToken: string,
  turkishSuffixes = true
) => {
  if (token === keywordToken) return true;
  if (keywordToken.length < 3 || !token.startsWith(keywordToken)) return false;
  const rest = token.slice(keywordToken.length);
  if (isSuffixChain(rest, EN_SUFFIXES)) return true;
  if (keywordToken.length < 4) return false;
  return turkishSuffixes
    ? isSuffixChain(rest, ALL_SUFFIXES)
    : TR_SUFFIXES.includes(rest);
};

/** Index of the first occurrence of the phrase (token sequence) in tokens, or -1 */
export const findPhrase = (
  tokens: string[],
  phrase: string[],
  exact = false,
  turkishSuffixes = true
): number => {
  if (phrase.length === 0) return -1;
  for (let i = 0; i + phrase.length <= tokens.length; i++) {
    const ok = phrase.every((word, j) =>
      // Only the last word of a phrase is inflected ("makine öğrenmesinde")
      j === phrase.length - 1 && !exact
        ? tokenMatches(tokens[i + j], word, turkishSuffixes)
        : tokens[i + j] === word
    );
    if (ok) return i;
  }
  return -1;
};
