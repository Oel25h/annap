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

/**
 * Head tags for a CMS page from the SEO the server worked out: canonical
 * (English when the Greek is not approved yet), hreflang pairs only when both
 * languages are real, Open Graph and Twitter in the page's language.
 */
export function pageHead(page: {
  locale: Locale;
  seo: {
    title: string;
    description: string;
    noindex: boolean;
    canonical: string;
    alternates: { en: string; el: string } | null;
    image: { src: string; width: number | null; height: number | null; alt: string } | null;
  };
  type?: "website" | "article" | "book";
}) {
  const { seo, locale } = page;
  const image = seo.image ? absoluteUrl(seo.image.src) : absoluteUrl("/og.jpg");
  const meta = [
    { title: seo.title },
    ...(seo.description ? [{ name: "description", content: seo.description }] : []),
    { property: "og:type", content: page.type ?? "website" },
    { property: "og:title", content: seo.title },
    ...(seo.description ? [{ property: "og:description", content: seo.description }] : []),
    { property: "og:url", content: seo.canonical },
    { property: "og:image", content: image },
    ...(seo.image?.width ? [{ property: "og:image:width", content: String(seo.image.width) }] : []),
    ...(seo.image?.height
      ? [{ property: "og:image:height", content: String(seo.image.height) }]
      : []),
    ...(seo.image?.alt ? [{ property: "og:image:alt", content: seo.image.alt }] : []),
    { property: "og:locale", content: OG_LOCALE[locale] },
    ...(seo.alternates
      ? [{ property: "og:locale:alternate", content: OG_LOCALE[locale === "en" ? "el" : "en"] }]
      : []),
    { name: "twitter:card", content: "summary_large_image" },
    ...(seo.noindex ? [{ name: "robots", content: "noindex" }] : []),
  ];
  const links = [
    ...(seo.noindex ? [] : [{ rel: "canonical", href: seo.canonical }]),
    ...(seo.alternates && !seo.noindex
      ? [
          { rel: "alternate", hrefLang: "en", href: seo.alternates.en },
          { rel: "alternate", hrefLang: "el", href: seo.alternates.el },
          { rel: "alternate", hrefLang: "x-default", href: seo.alternates.en },
        ]
      : []),
  ];
  return { meta, links };
}
