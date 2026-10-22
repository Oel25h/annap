/**
 * Greek set in capitals drops its accents ("Περιεχόμενα" reads ΠΕΡΙΕΧΟΜΕΝΑ),
 * but Chrome's `text-transform: uppercase` keeps them. Text that CSS sets in
 * capitals (labels, running heads) goes through this first: the tonos comes
 * off Greek letters, and where it kept two vowels apart the second one gets a
 * dialytika instead ("Μάιος" becomes "Μαϊος", so ΜΑΪΟΣ). Other scripts, and
 * the dialytika itself, pass through unchanged.
 */
const GREEK = /[Ͱ-Ͽἀ-῿]/;
const ACCENTS = /[̀́͂̓̔̓ͅ]/;

export function caps(text: string): string {
  if (!GREEK.test(text)) return text;
  const split = text
    .normalize("NFD")
    // ά ι → α ϊ: the accent on the first vowel kept the pair from being a diphthong.
    .replace(/([αεοΑΕΟ])́([ιυΙΥ])(?![̀-ͯ])/g, "$1$2̈");
  let out = "";
  let greekBase = false;
  for (const ch of split) {
    if (/[̀-ͯ]/.test(ch)) {
      if (greekBase && ACCENTS.test(ch)) continue;
    } else {
      greekBase = GREEK.test(ch);
    }
    out += ch;
  }
  return out.normalize("NFC");
}
