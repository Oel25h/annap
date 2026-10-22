/**
 * Times, durations and speeds as the player shows and speaks them. Every
 * helper prints the same on the server and in the browser, so nothing here
 * can break hydration.
 */
import { fmt } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";

type PlayerMessages = Messages["sections"]["player"];

const tags = { en: "en-GB", el: "el-GR" } as const;

/** 754 → "12:34", 3754 → "1:02:34". Lining tabular figures come from the CSS. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** "{n} chapter" or "{n} chapters", by the language's plural rules. */
export function plural(forms: { one: string; other: string }, n: number, locale: Locale): string {
  const form = new Intl.PluralRules(tags[locale]).select(n) === "one" ? forms.one : forms.other;
  return fmt(form, { n });
}

/** "3 h 50 min", "2 h 06 min", "18 min" / «4 ώρ. 10 λεπ.»: rounded to the minute, never "0 min" for time that is left. */
export function hoursMinutes(seconds: number, t: PlayerMessages): string {
  const total = Math.max(seconds > 0 ? 1 : 0, Math.round(seconds / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? fmt(t.hoursMinutes, { h, m: String(m).padStart(2, "0") }) : fmt(t.minutes, { m });
}

/** "24 minutes 10 seconds" for screen readers; zero parts are left out. */
export function spokenDuration(seconds: number, t: PlayerMessages, locale: Locale): string {
  const s = Math.round(seconds);
  const parts: [number, { one: string; other: string }][] = [
    [Math.floor(s / 3600), t.spoken.hours],
    [Math.floor((s % 3600) / 60), t.spoken.minutes],
    [s % 60, t.spoken.seconds],
  ];
  return parts
    .filter(([n]) => n > 0)
    .map(([n, forms]) => plural(forms, n, locale))
    .join(" ");
}

/** "1×", "1.25×", «1,25×». */
export function rateLabel(rate: number, locale: Locale): string {
  return `${new Intl.NumberFormat(tags[locale], { maximumFractionDigits: 2 }).format(rate)}×`;
}
