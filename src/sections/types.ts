/**
 * What the server hands to public pages. Types only: nothing here runs in the
 * browser, so section components can import it without pulling in Zod.
 */
import type { Locale } from "@/lib/i18n/locale";
import type { SectionOf, SectionType } from "./schemas";

/** A media library item, ready for `<img>`, `<audio>` or a download link. */
export type ResolvedMedia = {
  id: string;
  kind: "image" | "audio" | "video" | "document";
  /** The largest variant up to 1600 px wide, or the original. */
  src: string;
  /** `url 480w, url 960w, …` for images with variants. */
  srcSet: string | null;
  mime: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  alt: string;
  caption: string;
  credit: string;
  /** Language of the alt text and caption. */
  textLang: Locale;
  /** Placeholder colour while the image loads. */
  color: string | null;
  /** Crop centre, 0 to 1 from the left and top. */
  focalX: number;
  focalY: number;
};

export type MediaMap = Record<string, ResolvedMedia>;

/** Data a section needs beyond its own props, for the section types that have a loader. */
type SectionDataByType = Record<never, never>;

export type SectionDataMap = {
  [T in SectionType]: T extends keyof SectionDataByType ? SectionDataByType[T] : null;
};

export type RenderedSection<T extends SectionType = SectionType> = T extends SectionType
  ? SectionOf<T> & {
      /** The language the section's text is in. */
      lang: Locale;
      /** Flattened keys still in English on a Greek page (a partly updated translation). */
      englishKeys: string[];
      data: SectionDataMap[T] | null;
    }
  : never;

export type PageSeo = {
  title: string;
  description: string;
  noindex: boolean;
  /** Absolute URLs. */
  canonical: string;
  alternates: { en: string; el: string } | null;
  image: ResolvedMedia | null;
};

export type PageData = {
  id: string;
  path: string;
  kind: string;
  locale: Locale;
  title: string;
  /** The language of the title and SEO text. */
  titleLang: Locale;
  /** A Greek page with some English on it shows a quiet notice. */
  hasEnglishParts: boolean;
  sections: RenderedSection[];
  media: MediaMap;
  seo: PageSeo;
};
