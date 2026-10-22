import { absoluteUrl } from "./site-url";
import { localizePath, type Locale } from "./i18n/locale";

type SeoInput = {
  locale: Locale;
  /** English, site-relative path of this page, e.g. `/about`. */
  path: string;
  title: string;
  description?: string;
  /** Site-relative or absolute image URL. */
  image?: string;
  type?: "website" | "article" | "book";
  noindex?: boolean;
};

const OG_LOCALE: Record<Locale, string> = { en: "en_US", el: "el_GR" };

/**
 * Head tags for one page: a single absolute canonical, reciprocal hreflang
 * pairs, and Open Graph / Twitter tags in the page's language.
 */
export function seoHead({
  locale,
  path,
  title,
  description,
  image,
  type = "website",
  noindex,
}: SeoInput) {
  const url = absoluteUrl(localizePath(path, locale));
  const imageUrl = absoluteUrl(image ?? "/og.jpg");
  const meta = [
    { title },
    ...(description ? [{ name: "description", content: description }] : []),
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    ...(description ? [{ property: "og:description", content: description }] : []),
    { property: "og:url", content: url },
    { property: "og:image", content: imageUrl },
    { property: "og:locale", content: OG_LOCALE[locale] },
    { property: "og:locale:alternate", content: OG_LOCALE[locale === "en" ? "el" : "en"] },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    ...(description ? [{ name: "twitter:description", content: description }] : []),
    { name: "twitter:image", content: imageUrl },
    ...(noindex ? [{ name: "robots", content: "noindex" }] : []),
  ];
  const links = noindex
    ? []
    : [
        { rel: "canonical", href: url },
        { rel: "alternate", hrefLang: "en", href: absoluteUrl(localizePath(path, "en")) },
        { rel: "alternate", hrefLang: "el", href: absoluteUrl(localizePath(path, "el")) },
        { rel: "alternate", hrefLang: "x-default", href: absoluteUrl(localizePath(path, "en")) },
      ];
  return { meta, links };
}
