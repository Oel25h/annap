/**
 * The UI copy, one catalog per language. A page ships only its own language's
 * catalog: the root route's beforeLoad loads it (loadMessages), the server
 * writes it into the page (router dehydrate) and the browser takes it from
 * there before hydrating (provideMessages), so getMessages stays synchronous.
 * Server modules that may run outside a page request use ./all instead.
 */
import type { Messages } from "./en";
import type { Locale } from "../locale";

const loaders: Record<Locale, () => Promise<Messages>> = {
  en: () => import("./en").then((m) => m.en),
  el: () => import("./el").then((m) => m.el),
};
const loaded: Partial<Record<Locale, Messages>> = {};

export async function loadMessages(locale: Locale): Promise<Messages> {
  return (loaded[locale] ??= await loaders[locale]());
}

export function provideMessages(locale: Locale, messages: Messages): void {
  loaded[locale] = messages;
}

/**
 * The catalog for a language once it is loaded. Until then (an error page
 * after a failed load, say) the page's own catalog stands in.
 */
export function getMessages(locale: Locale): Messages {
  const messages = loaded[locale] ?? loaded.en ?? loaded.el;
  if (!messages) throw new Error(`Messages for "${locale}" are not loaded`);
  return messages;
}

export type { Messages };
