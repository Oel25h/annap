/**
 * Section schemas: the one definition of what each section type stores.
 *
 * Used on the server (validating drafts, published pages and Greek overlays)
 * and in the studio (forms and the publish checklist). Public section
 * components import only the inferred types, so Zod never ships to visitors.
 *
 * Rules shared by every schema:
 * - Images, audio and files are referenced by media library id (`…MediaId`).
 * - Repeated items carry a stable `id`, so a Greek overlay follows an item
 *   when it is reordered.
 * - URL fields accept only https:, mailto:, tel: or a site path.
 * - Translatable text is declared in TRANSLATABLE below; nothing else is ever
 *   taken from a translation.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const id = z.string().uuid();
const mediaId = z.string().uuid();
const optionalMediaId = mediaId.nullable().default(null);

/** Plain text with a length cap. */
const text = (max: number) => z.string().trim().max(max).default("");
/** Text the studio requires before publishing. */
const requiredText = (max: number) => z.string().trim().min(1).max(max);
/** Sanitised HTML from the rich-text editor. */
const rich = (max = 50_000) => z.string().max(max).default("");

export const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) => /^(https:\/\/|mailto:|tel:)/i.test(value) || /^\/(?!\/)/.test(value),
    "Use a link that starts with https://, mailto:, tel: or /",
  );

const link = z.object({
  label: requiredText(60),
  href: safeUrl,
});

const optionalLink = z
  .object({ label: text(60), href: z.union([safeUrl, z.literal("")]).default("") })
  .default({ label: "", href: "" });

// ---------------------------------------------------------------------------
// Settings shared by every section
// ---------------------------------------------------------------------------

export const SECTION_WIDTHS = ["narrow", "default", "wide", "full"] as const;
export const SECTION_SPACINGS = ["compact", "default", "generous"] as const;
export const SECTION_BACKGROUNDS = ["ivory", "cream", "cocoa"] as const;

export const sectionSettingsSchema = z.object({
  hidden: z.boolean().default(false),
  anchor: z
    .string()
    .trim()
    .max(40)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and dashes")
    .default(""),
  width: z.enum(SECTION_WIDTHS).default("default"),
  spacing: z.enum(SECTION_SPACINGS).default("default"),
  background: z.enum(SECTION_BACKGROUNDS).default("ivory"),
});

export type SectionSettings = z.infer<typeof sectionSettingsSchema>;

// ---------------------------------------------------------------------------
// Section types
// ---------------------------------------------------------------------------

function section<
  T extends string,
  V extends readonly [string, ...string[]],
  P extends z.ZodTypeAny,
>(type: T, variants: V, props: P) {
  return z.object({
    id,
    type: z.literal(type),
    variant: z.enum(variants).default(variants[0] as V[number] as never),
    settings: sectionSettingsSchema.default({}),
    props,
  });
}

const hero = section(
  "hero",
  ["portrait_arch", "full_bleed", "text_only"],
  z.object({
    eyebrow: text(80),
    title: requiredText(140),
    /** Words of the title shown in the accent colour (must appear in the title). */
    accent: text(60),
    body: text(600),
    imageMediaId: optionalMediaId,
    caption: text(240),
    primary: optionalLink,
    secondary: optionalLink,
    /** Show "Listen to the audiobook" that jumps to the player on this page. */
    listenCta: z.boolean().default(false),
  }),
);

const audiobookPlayer = section(
  "audiobook_player",
  ["single", "shelf"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    intro: text(400),
    /** Empty means every published audiobook for the page's language. */
    audiobookIds: z.array(id).max(12).default([]),
  }),
);

const featuredBook = section(
  "featured_book",
  ["cover_left", "cover_right"],
  z.object({
    bookId: id,
    eyebrow: text(80),
    quote: text(300),
    quoteBy: text(80),
    /** Show the free-ebook form under the book. */
    showEbookGate: z.boolean().default(true),
  }),
);

const bookList = section(
  "book_list",
  ["grid", "rows"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    intro: text(400),
  }),
);

const bookExcerpts = section(
  "book_excerpts",
  ["cards", "stacked"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    bookId: id.nullable().default(null),
    items: z
      .array(
        z.object({ id, label: text(40), title: requiredText(140), excerpt: requiredText(1200) }),
      )
      .min(1)
      .max(24),
  }),
);

const ebookGate = section(
  "ebook_gate",
  ["inline", "card"],
  z.object({
    bookId: id,
    eyebrow: text(80),
    title: requiredText(140),
    body: text(500),
    buttonLabel: text(60),
  }),
);

const richText = section(
  "rich_text",
  ["one_column", "with_pull_quote"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    body: rich(),
    pullQuote: text(300),
  }),
);

const twoColumn = section(
  "two_column",
  ["image_left", "image_right"],
  z.object({
    eyebrow: text(80),
    title: requiredText(140),
    body: rich(20_000),
    imageMediaId: mediaId,
    link: optionalLink,
  }),
);

const quote = section(
  "quote",
  ["large", "with_portrait"],
  z.object({
    quote: requiredText(400),
    /** Words of the quote shown in the accent colour. */
    accent: text(80),
    by: text(80),
    imageMediaId: optionalMediaId,
  }),
);

const image = section(
  "image",
  ["contained", "full_bleed"],
  z.object({
    imageMediaId: mediaId,
    caption: text(240),
  }),
);

const gallery = section(
  "gallery",
  ["grid", "masonry", "carousel", "filmstrip"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    /** An album, or hand-picked images when albumId is empty. */
    albumId: id.nullable().default(null),
    imageMediaIds: z.array(mediaId).max(60).default([]),
  }),
);

const video = section(
  "video",
  ["single", "grid", "latest"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    /** For "single" and "grid"; "latest" uses the newest synced videos. */
    videoIds: z.array(id).max(12).default([]),
    channelLink: optionalLink,
  }),
);

const latestPosts = section(
  "latest_posts",
  ["list", "grid"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    categoryId: id.nullable().default(null),
    count: z.number().int().min(1).max(12).default(3),
    showCategories: z.boolean().default(true),
    link: optionalLink,
  }),
);

const stats = section(
  "stats",
  ["row"],
  z.object({
    items: z
      .array(z.object({ id, value: requiredText(20), label: requiredText(80) }))
      .min(1)
      .max(6),
  }),
);

const timeline = section(
  "timeline",
  ["vertical"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    items: z
      .array(
        z.object({
          id,
          label: text(40),
          title: requiredText(140),
          body: text(1200),
          imageMediaId: optionalMediaId,
        }),
      )
      .min(1)
      .max(30),
  }),
);

const list = section(
  "list",
  ["numbered", "plain"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    intro: text(400),
    items: z
      .array(z.object({ id, title: requiredText(140), body: text(600) }))
      .min(1)
      .max(20),
  }),
);

const testimonials = section(
  "testimonials",
  ["single", "carousel"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    /** Only praise for this book, when set. */
    bookId: id.nullable().default(null),
    testimonialIds: z.array(id).max(20).default([]),
  }),
);

const products = section(
  "products",
  ["grid"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    categoryId: id.nullable().default(null),
  }),
);

const masterclasses = section(
  "masterclasses",
  ["list", "cards"],
  z.object({ eyebrow: text(80), title: text(140), intro: text(400) }),
);

const events = section(
  "events",
  ["upcoming_list", "cards"],
  z.object({ eyebrow: text(80), title: text(140), showPast: z.boolean().default(true) }),
);

const press = section(
  "press",
  ["logo_row", "list"],
  z.object({ eyebrow: text(80), title: text(140) }),
);

const mediaKit = section(
  "media_kit",
  ["default"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    shortBio: requiredText(600),
    longBio: rich(10_000),
    downloadMediaIds: z.array(mediaId).max(24).default([]),
  }),
);

const foundationStories = section(
  "foundation_stories",
  ["grid", "list"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    categoryId: id.nullable().default(null),
    count: z.number().int().min(1).max(24).default(6),
  }),
);

const donation = section(
  "donation",
  ["card", "band"],
  z.object({
    eyebrow: text(80),
    title: requiredText(140),
    body: text(600),
    /** Preset amounts in whole euros. */
    amounts: z.array(z.number().int().min(1).max(10_000)).min(1).max(6).default([10, 25, 50, 100]),
    allowMonthly: z.boolean().default(true),
  }),
);

const newsletter = section(
  "newsletter",
  ["inline", "band"],
  z.object({ eyebrow: text(80), title: requiredText(140), body: text(400) }),
);

const contactForm = section(
  "contact_form",
  ["default"],
  z.object({ eyebrow: text(80), title: text(140), body: text(600) }),
);

const faq = section(
  "faq",
  ["accordion"],
  z.object({
    eyebrow: text(80),
    title: text(140),
    items: z
      .array(z.object({ id, question: requiredText(200), answer: requiredText(2000) }))
      .min(1)
      .max(30),
  }),
);

const callToAction = section(
  "call_to_action",
  ["band", "card"],
  z.object({ eyebrow: text(80), title: requiredText(140), body: text(400), link }),
);

const linkList = section(
  "link_list",
  ["stacked"],
  z.object({
    items: z
      .array(
        z.object({
          id,
          label: requiredText(80),
          description: text(140),
          href: safeUrl,
          featured: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(20),
    showSocialLinks: z.boolean().default(true),
  }),
);

const embed = section(
  "embed",
  ["default"],
  z.object({
    title: text(140),
    provider: z.enum(["youtube", "vimeo", "spotify", "google_maps"]),
    /** The provider's id, parsed from the pasted URL by the studio. */
    externalId: z.string().regex(/^[A-Za-z0-9_\-:.!/=?&%]{1,300}$/),
    posterMediaId: optionalMediaId,
  }),
);

export const SECTION_SCHEMAS = {
  hero,
  audiobook_player: audiobookPlayer,
  featured_book: featuredBook,
  book_list: bookList,
  book_excerpts: bookExcerpts,
  ebook_gate: ebookGate,
  rich_text: richText,
  two_column: twoColumn,
  quote,
  image,
  gallery,
  video,
  latest_posts: latestPosts,
  stats,
  timeline,
  list,
  testimonials,
  products,
  masterclasses,
  events,
  press,
  media_kit: mediaKit,
  foundation_stories: foundationStories,
  donation,
  newsletter,
  contact_form: contactForm,
  faq,
  call_to_action: callToAction,
  link_list: linkList,
  embed,
} as const;

export type SectionType = keyof typeof SECTION_SCHEMAS;
export const SECTION_TYPES = Object.keys(SECTION_SCHEMAS) as SectionType[];

export type SectionOf<T extends SectionType> = z.infer<(typeof SECTION_SCHEMAS)[T]>;
export type AnySection = { [T in SectionType]: SectionOf<T> }[SectionType];
export type SectionPropsOf<T extends SectionType> = SectionOf<T>["props"];

export function isSectionType(value: unknown): value is SectionType {
  return typeof value === "string" && value in SECTION_SCHEMAS;
}

/**
 * Translatable fields per section type. Plain keys are props; `items[].x`
 * is field x of every item in the items array. Kinds: "text" is plain text,
 * "rich" is sanitised HTML.
 */
export const TRANSLATABLE: { [T in SectionType]: Record<string, "text" | "rich"> } = {
  hero: {
    eyebrow: "text",
    title: "text",
    accent: "text",
    body: "text",
    caption: "text",
    "primary.label": "text",
    "secondary.label": "text",
  },
  audiobook_player: { eyebrow: "text", title: "text", intro: "text" },
  featured_book: { eyebrow: "text", quote: "text", quoteBy: "text" },
  book_list: { eyebrow: "text", title: "text", intro: "text" },
  book_excerpts: {
    eyebrow: "text",
    title: "text",
    "items[].label": "text",
    "items[].title": "text",
    "items[].excerpt": "text",
  },
  ebook_gate: { eyebrow: "text", title: "text", body: "text", buttonLabel: "text" },
  rich_text: { eyebrow: "text", title: "text", body: "rich", pullQuote: "text" },
  two_column: { eyebrow: "text", title: "text", body: "rich", "link.label": "text" },
  quote: { quote: "text", accent: "text", by: "text" },
  image: { caption: "text" },
  gallery: { eyebrow: "text", title: "text" },
  video: { eyebrow: "text", title: "text", "channelLink.label": "text" },
  latest_posts: { eyebrow: "text", title: "text", "link.label": "text" },
  stats: { "items[].value": "text", "items[].label": "text" },
  timeline: {
    eyebrow: "text",
    title: "text",
    "items[].label": "text",
    "items[].title": "text",
    "items[].body": "text",
  },
  list: {
    eyebrow: "text",
    title: "text",
    intro: "text",
    "items[].title": "text",
    "items[].body": "text",
  },
  testimonials: { eyebrow: "text", title: "text" },
  products: { eyebrow: "text", title: "text" },
  masterclasses: { eyebrow: "text", title: "text", intro: "text" },
  events: { eyebrow: "text", title: "text" },
  press: { eyebrow: "text", title: "text" },
  media_kit: { eyebrow: "text", title: "text", shortBio: "text", longBio: "rich" },
  foundation_stories: { eyebrow: "text", title: "text" },
  donation: { eyebrow: "text", title: "text", body: "text" },
  newsletter: { eyebrow: "text", title: "text", body: "text" },
  contact_form: { eyebrow: "text", title: "text", body: "text" },
  faq: { eyebrow: "text", title: "text", "items[].question": "text", "items[].answer": "text" },
  call_to_action: { eyebrow: "text", title: "text", body: "text", "link.label": "text" },
  link_list: { "items[].label": "text", "items[].description": "text" },
  embed: { title: "text" },
};
