export const LOCALES = ["en", "el"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "aph_locale";
export const LOCALE_PREFIX = "/el";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "el";
}

/** Pathname → locale (English is unprefixed). */
export function getLocaleFromPath(pathname: string): Locale {
  if (pathname === "/el" || pathname.startsWith("/el/")) return "el";
  return "en";
}

/** Strip `/el` prefix for the underlying English path. */
export function stripLocale(pathname: string): string {
  if (pathname === "/el") return "/";
  if (pathname.startsWith("/el/")) {
    const rest = pathname.slice(3);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname;
}

/** Prefix a site-relative path for the given locale. */
export function localizePath(path: string, locale: Locale): string {
  const bare = stripLocale(path.startsWith("/") ? path : `/${path}`);
  if (locale === "en") return bare === "" ? "/" : bare;
  if (bare === "/") return "/el";
  return `/el${bare}`;
}

/** Switch current pathname to another locale, preserving path + search. */
export function switchLocalePath(pathname: string, next: Locale, search = ""): string {
  return `${localizePath(pathname, next)}${search}`;
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
