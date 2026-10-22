/** Canonical public origin for OG tags, sitemap, robots. */
export function siteUrl(): string {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
    process.env.VITE_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:8080";
  return String(raw).replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = siteUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
