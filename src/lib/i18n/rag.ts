/**
 * Binds every one- and two-letter word to the word after it with a no-break
 * space, so a line of display, lead, caption or subtitle copy never ends on
 * "a", "I", "to", "σε" or "το". Plain text only, never HTML.
 */
const SHORT_WORD = /(?<=^|[\s(«"“‘—–-])([\p{L}\p{N}&]{1,2})[ \t]+(?=\S)/gu;

export function nb(text: string): string {
  return text.replace(SHORT_WORD, "$1 ");
}
