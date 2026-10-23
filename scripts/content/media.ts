/**
 * The starting photo library. Fixed ids, so the content migration can point
 * at images before they are uploaded; scripts/seed-media.ts uploads them to
 * any Supabase project (local now, production at cutover).
 *
 * These are the photographs Joel supplied with the site (src/assets), used
 * as on the original site (Joel, 2026-10-23). gallery-community.jpg, a crowd
 * of strangers, is the one left out.
 */
export type SeedImage = {
  id: string;
  key: string;
  /** Relative to the repository root. */
  file: string;
  alt: string;
  caption?: string;
  focal?: [number, number];
  /** Book covers: books with this cover_url get it as their cover. */
  coverUrl?: string;
  /** Blog posts with this cover_url get it as their cover. */
  postCoverUrl?: string;
  /** Blog posts with this slug get it as their cover (when they have none). */
  postSlug?: string;
  /** Masterclasses with this slug get it as their cover (when they have none). */
  masterclassSlug?: string;
};

const id = (n: number) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const MEDIA = {
  heroPortrait: {
    id: id(1),
    key: "hero-portrait",
    file: "src/assets/hero-portrait.jpg",
    alt: "Anastasia Patience in a cream blazer, smiling, her chin resting on her hand",
    focal: [0.55, 0.36],
  },
  portraitBurgundy: {
    id: id(2),
    key: "portrait-burgundy",
    file: "src/assets/portrait-two.jpg",
    alt: "Anastasia Patience in a burgundy blouse, smiling warmly",
    focal: [0.5, 0.32],
  },
  portraitRust: {
    id: id(3),
    key: "portrait-rust",
    file: "src/assets/anastasia-portrait-three.jpg",
    alt: "Anastasia Patience in a rust-orange blouse, smiling",
    focal: [0.5, 0.3],
  },
  bookDesk: {
    id: id(4),
    key: "book-desk",
    file: "src/assets/anastasia-book-desk.jpg",
    alt: "Anastasia at her desk beside a copy of Find Your Reason to Smile",
    focal: [0.42, 0.38],
  },
  authorTable: {
    id: id(5),
    key: "author-table",
    file: "src/assets/fyrts-author.jpg",
    alt: "Anastasia at a table with flowers and her book, Find Your Reason to Smile",
    focal: [0.38, 0.42],
  },
  coverFyrts: {
    id: id(6),
    key: "cover-find-your-reason-to-smile",
    file: "src/assets/fyrts-cover.jpg",
    alt: "The cover of Find Your Reason to Smile: a sunrise over the sea",
    coverUrl: "/fyrts-cover.jpg",
  },
  coverTpip: {
    id: id(7),
    key: "cover-turning-pain-into-purpose",
    file: "public/book-turning-pain.jpg",
    alt: "The cover of Turning Pain Into Purpose: a lotus drawn in gold on cream linen",
    coverUrl: "/book-turning-pain.jpg",
  },
  cyprus: {
    id: id(8),
    key: "cyprus-coast",
    file: "src/assets/gallery-cyprus.jpg",
    alt: "Pastel houses above the sea on the coast of Cyprus at golden hour",
    caption: "Cyprus, the island that became home.",
  },
  sunset: {
    id: id(9),
    key: "sunset-silhouette",
    file: "src/assets/gallery-ghana.jpg",
    alt: "A woman’s silhouette against an orange sunset",
    focal: [0.55, 0.5],
  },
  hands: {
    id: id(10),
    key: "hands-light",
    file: "src/assets/pathway-purpose.jpg",
    alt: "Cupped hands holding the light of the setting sun",
    focal: [0.5, 0.45],
  },
  // id(11) was the foundation emblem, retired: never reuse it.
  // id(12) and id(13) were blog-one.jpg and blog-two.jpg, retired once and deleted by a
  // migration: never reuse those ids. Both photos are back as id(16) and id(17).
  windowPrayer: {
    id: id(14),
    key: "window-prayer",
    file: "src/assets/blog-three.jpg",
    alt: "A silhouette with raised hands in front of a sunlit window",
    postCoverUrl: "/blog-three.jpg",
    postSlug: "faith-when-the-doctors-say-no",
  },
  socialCard: {
    id: id(15),
    key: "social-card",
    file: "public/og.jpg",
    alt: "Anastasia Patience, author of Find Your Reason to Smile",
  },
  journal: {
    id: id(16),
    key: "journal-tea",
    file: "src/assets/blog-one.jpg",
    alt: "An open journal, a fountain pen and a cup of tea on a velvet throw",
    postSlug: "the-morning-i-decided-to-keep-going",
  },
  writingDesk: {
    id: id(17),
    key: "writing-desk",
    file: "src/assets/blog-two.jpg",
    alt: "A woman in a lilac cardigan writing at her laptop by a sunlit window",
    focal: [0.45, 0.4],
    postSlug: "your-first-digital-product-in-30-days",
  },
  speaking: {
    id: id(18),
    key: "speaking",
    file: "src/assets/gallery-speaking.jpg",
    alt: "Speaking to a full room, microphone in hand",
    caption: "Speaking and livestreams.",
    focal: [0.55, 0.45],
  },
  behindScenes: {
    id: id(19),
    key: "behind-the-scenes",
    file: "src/assets/gallery-bts.jpg",
    alt: "In profile beside studio lights and a camera, behind the scenes of a shoot",
    caption: "Behind the scenes.",
    focal: [0.6, 0.4],
  },
  family: {
    id: id(20),
    key: "family-moments",
    file: "src/assets/gallery-family.jpg",
    alt: "A mother holding two small children by a sunlit window",
    caption: "Family moments.",
    focal: [0.5, 0.4],
  },
  authorQuote: {
    id: id(21),
    key: "author-quote",
    file: "src/assets/fyrts-quote.jpg",
    alt: "Anastasia in an orange blouse at a table with her book, beside the words “No matter what you’re facing, your reason to smile still exists.”",
    focal: [0.5, 0.45],
  },
  laptop: {
    id: id(22),
    key: "laptop-work",
    file: "src/assets/pathway-work.jpg",
    alt: "Hands typing on a laptop beside an open notebook and a rose",
    masterclassSlug: "masterclass",
  },
  openBook: {
    id: id(23),
    key: "open-book",
    file: "src/assets/pathway-build.jpg",
    alt: "An open book with a gold ribbon on red velvet, in a shaft of sunlight",
  },
} satisfies Record<string, SeedImage>;

export const MEDIA_LIST: SeedImage[] = Object.values(MEDIA);
