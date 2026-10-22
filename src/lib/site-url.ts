import { getPublicConfig } from "./public-config";

/** Canonical public origin for OG tags, sitemap, robots. */
export function siteUrl(): string {
  return getPublicConfig().siteUrl;
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = siteUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
