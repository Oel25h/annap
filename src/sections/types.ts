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

export type BookFormat = "paperback" | "hardcover" | "ebook" | "audiobook";

export type BookOffer = {
  id: string;
  format: BookFormat;
  retailer: string;
  externalUrl: string | null;
  priceCents: number | null;
  currency: string;
  /** Sold here through Stripe Checkout (Stripe connected and a price set). */
  buyHere: boolean;
};

export type BookSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  tagline: string;
  description: string;
  coverMediaId: string | null;
  textLang: Locale;
  offers: BookOffer[];
  /** A free download exists in the page's language (or in English). */
  freeDownload: Locale | null;
};

export type AudiobookTrack = {
  id: string;
  title: string;
  /** Null for chapters that are not free to stream: they show a lock and the buy link. */
  audioMediaId: string | null;
  durationSeconds: number | null;
  /** The chapter's first sentence, set large beside her voice. May be empty. */
  openingLine: string;
};

export type AudiobookItem = {
  id: string;
  title: string;
  subtitle: string;
  narrator: string;
  coverMediaId: string | null;
  /** The language of the recording. */
  locale: Locale;
  bookSlug: string | null;
  tracks: AudiobookTrack[];
};

export type PostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: { slug: string; name: string } | null;
  publishedAt: string | null;
  readingMinutes: number | null;
  coverMediaId: string | null;
  textLang: Locale;
};

export type VideoCard = {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  thumbnailMediaId: string | null;
  textLang: Locale;
};

export type TestimonialItem = {
  id: string;
  quote: string;
  name: string;
  role: string;
  photoMediaId: string | null;
  textLang: Locale;
};

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  productType: string;
  /** Formatted on the server from price_cents, or the free-text label. */
  priceCents: number | null;
  currency: string;
  priceLabel: string;
  coverMediaId: string | null;
  textLang: Locale;
};

export type MasterclassCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  startsAt: string | null;
  scheduleNote: string;
  format: "online" | "in_person" | "hybrid";
  location: string;
  priceLabel: string;
  availability: "open" | "waitlist" | "closed";
  coverMediaId: string | null;
  textLang: Locale;
};

export type EventCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string | null;
  timeZone: string;
  online: boolean;
  venue: string;
  city: string;
  ticketUrl: string | null;
  coverMediaId: string | null;
  textLang: Locale;
};

export type PressItem = {
  id: string;
  outlet: string;
  headline: string;
  publishedOn: string | null;
  url: string | null;
  logoMediaId: string | null;
};

export type StoryCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  /** First name only when the story is anonymised. */
  personName: string;
  location: string;
  category: string;
  /** Null when the story is anonymised (no face photos). */
  coverMediaId: string | null;
  textLang: Locale;
};

export type PostPagination = {
  page: number;
  pages: number;
  /** The category slug being shown, or null for all. */
  category: string | null;
};

/** Query parameters a page's sections may read (the journal index's page and category). */
export type PageQuery = { page?: number; category?: string };

/** Data a section needs beyond its own props, for the section types that have a loader. */
type SectionDataByType = {
  featured_book: { book: BookSummary };
  ebook_gate: { book: BookSummary };
  book_list: { books: BookSummary[] };
  book_excerpts: { book: { slug: string; title: string } | null };
  audiobook_player: { audiobooks: AudiobookItem[]; fallbackToEnglish: boolean };
  latest_posts: {
    posts: PostCard[];
    categories: { slug: string; name: string }[];
    /** Present on the journal index (a section with `paginate`). */
    pagination: PostPagination | null;
  };
  video: { videos: VideoCard[] };
  testimonials: { items: TestimonialItem[] };
  gallery: { imageMediaIds: string[] };
  donation: { payments: boolean };
  products: { products: ProductCard[] };
  masterclasses: { items: MasterclassCard[] };
  events: { upcoming: EventCard[]; past: EventCard[] };
  press: { items: PressItem[] };
  foundation_stories: { stories: StoryCard[] };
};

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

/**
 * The opening of a collection item's page (a book, a post, a product…): the
 * item itself, set above its sections in place of the title band.
 */
export type ItemIntro =
  | { kind: "book"; book: BookSummary; whoFor: string }
  | { kind: "post"; post: PostCard; bodyHtml: string; related: PostCard[] }
  | {
      kind: "product";
      product: ProductCard;
      description: string;
      whoFor: string;
      included: string[];
      compareAtCents: number | null;
      stockNote: string;
      /** Sold here through Stripe Checkout. */
      buyHere: boolean;
      /** Otherwise, where to get it. */
      externalUrl: string | null;
    }
  | {
      kind: "masterclass";
      masterclass: MasterclassCard;
      endsAt: string | null;
      description: string;
      included: string[];
      enrolUrl: string | null;
      /** A product sold here that enrols the buyer. */
      enrolProductId: string | null;
      payments: boolean;
    }
  | { kind: "event"; event: EventCard }
  | { kind: "story"; story: StoryCard; bodyHtml: string };

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
  /** Collection items only. */
  intro?: ItemIntro;
  /** schema.org data for search engines (Book, BlogPosting, Product, Event), as JSON text. */
  jsonLd?: string;
};
