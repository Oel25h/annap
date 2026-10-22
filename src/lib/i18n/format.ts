/** Fill `{name}` placeholders in a message: fmt("Chapter {n} of {total}", { n: 2, total: 9 }). */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const ZONE = "Europe/Nicosia";
const tags = { en: "en-GB", el: "el-GR" } as const;

/**
 * "12 March 2026" / "12 Μαρτίου 2026". Always in Cyprus time, so the server
 * and the browser print the same day.
 */
export function formatDate(
  value: string | null | undefined,
  locale: "en" | "el",
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
  timeZone: string = ZONE,
): string {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(tags[locale], { ...options, timeZone }).format(date);
}

export function formatMoney(cents: number, currency: string, locale: "en" | "el"): string {
  return new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
