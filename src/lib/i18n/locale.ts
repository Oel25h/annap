export const LOCALES = ["en", "el"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "aph_locale";
export const LOCALE_PREFIX = "/el";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "el";
}

/** Public path for a locale (English is unprefixed). Pass an English path such as `/about`. */
export function localizePath(path: string, locale: Locale): string {
  const bare = path.startsWith("/") ? path : `/${path}`;
  if (locale === "en") return bare;
  return bare === "/" ? "/el" : `/el${bare}`;
}

/**
 * A site path written in rich text, moved to the locale's edition. Leaves
 * alone: other links, paths already under /el, the studio, sign-in and API
 * paths, and files such as /og.jpg.
 */
export function localizeHref(href: string, locale: Locale): string {
  if (locale === "en" || !href.startsWith("/") || href.startsWith("//")) return href;
  const [, path = "/", rest = ""] = /^([^?#]*)(.*)$/.exec(href) ?? [];
  if (/^\/(el|admin|auth|api)(\/|$)/.test(path) || /\.\w+$/.test(path)) return href;
  return localizePath(path || "/", locale) + rest;
}

export function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const v = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isLocale(v) ? v : null;
}

export function writeLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAge}; samesite=lax`;
}

/** Soft detect: browser prefers Greek. */
export function browserPrefersGreek(): boolean {
  if (typeof navigator === "undefined") return false;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => l.toLowerCase().startsWith("el"));
}
