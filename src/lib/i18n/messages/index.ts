import { en, type Messages } from "./en";
import { el } from "./el";
import type { Locale } from "../locale";

const catalogs: Record<Locale, Messages> = { en, el };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? en;
}

export type { Messages };
