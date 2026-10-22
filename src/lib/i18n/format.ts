/** Fill `{name}` placeholders in a message: fmt("Chapter {n} of {total}", { n: 2, total: 9 }). */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const ZONE = "Europe/Nicosia";
/** English dates read month first (DESIGN.md §13); times stay 24-hour everywhere. */
const tags = { en: "en-US", el: "el-GR" } as const;

/**
 * "March 12, 2026" / "12 Μαρτίου 2026". Always in Cyprus time, so the server
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

/** Wall-clock fields of a moment in a time zone, from numeric parts that print the same in every browser. */
function wallClock(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
  };
}

/** "UTC+2", "UTC−5", "UTC+5:30": the zone's offset at that moment. */
export function utcOffset(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const wall = wallClock(date, timeZone);
  const local = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  const minutes = Math.round((local - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000);
  if (minutes === 0) return "UTC";
  const abs = Math.abs(minutes);
  const sign = minutes > 0 ? "+" : "\u2212";
  return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, "0")}` : ""}`;
}

/**
 * "Saturday, December 12, 2026, 19:00" / "Σάββατο 12 Δεκεμβρίου 2026, 19:00".
 * Built from simple parts, because browsers and the server disagree on the
 * punctuation of the combined long formats, which would break hydration.
 */
export function formatWhen(
  value: string | null | undefined,
  locale: "en" | "el",
  { weekday = false, time = false, timeZone = ZONE } = {},
): string {
  const day = formatDate(value, locale, undefined, timeZone);
  if (!value || !day) return "";
  const name = weekday ? formatDate(value, locale, { weekday: "long" }, timeZone) : "";
  const date = name ? `${name}${locale === "en" ? "," : ""} ${day}` : day;
  if (!time) return date;
  const wall = wallClock(new Date(value), timeZone);
  return `${date}, ${wall.hour}:${String(wall.minute).padStart(2, "0")}`;
}

export function formatMoney(cents: number, currency: string, locale: "en" | "el"): string {
  return new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
