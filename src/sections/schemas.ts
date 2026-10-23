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
 * - URL fields accept only https:, mailto:, tel:, a site path or a #anchor on the page.
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
    (value) =>
      /^(https:\/\/|mailto:|tel:)/i.test(value) ||
      /^\/(?!\/)/.test(value) ||
      /^#[a-z0-9]+(-[a-z0-9]+)*$/.test(value),
    "Use a link that starts with https://, mailto:, tel:, / or # (a place on this page)",
  );

const link = z.object({
  label: requiredText(60),
  href: safeUrl,
});

const optionalLink = z
  .object({ label: text(60), href: z.union([safeUrl, z.literal("")]).default("") })
  .default({ label: "", href: "" });

/**
 * One of `values`, also reading the old names in `renamed`, so data stored
 * before a rename (and not yet migrated) still renders.
 */
function renamedEnum<V extends readonly [string, ...string[]]>(
  values: V,
  renamed: Partial<Record<string, V[number]>>,
) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && Object.hasOwn(renamed, value) ? renamed[value] : value,
    z.enum(values),
  );
}

// ---------------------------------------------------------------------------
// Settings shared by every section
// ---------------------------------------------------------------------------

/** narrow: the 720 reading column. default: the 1280 grid. full: edge to edge. */
export const SECTION_WIDTHS = ["narrow", "default", "full"] as const;
export const SECTION_SPACINGS = ["compact", "default", "generous"] as const;
export const SECTION_BACKGROUNDS = ["ivory", "cream"] as const;

export type SectionWidth = (typeof SECTION_WIDTHS)[number];

/** The width names the studio shows. */
export const SECTION_WIDTH_LABELS: Record<SectionWidth, string> = {
  narrow: "Text 720",
  default: "Wide 1280",
  full: "Edge to edge",
};

export const sectionSettingsSchema = z.object({
  hidden: z.boolean().default(false),
  anchor: z
    .string()
    .trim()
    .max(40)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and dashes")
    .default(""),
  // "wide" was a fourth width with no layout of its own; it reads as the grid.
  width: renamedEnum(SECTION_WIDTHS, { wide: "default" }).default("default"),
  spacing: z.enum(SECTION_SPACINGS).default("default"),
  // The site is bright: the retired dark "cocoa" band reads as ivory.
  background: z
    .preprocess((v) => (v === "cocoa" ? "ivory" : v), z.enum(SECTION_BACKGROUNDS))
    .default("ivory"),
});

export type SectionSettings = z.infer<typeof sectionSettingsSchema>;

// ---------------------------------------------------------------------------
// Section types
// ---------------------------------------------------------------------------

function section<
  T extends string,
  V extends readonly [string, ...string[]],
  P extends z.ZodTypeAny,
>(type: T, variants: V, props: P, renamedVariants: Partial<Record<string, V[number]>> = {}) {
  return z.object({
    id,
    type: z.literal(type),
    variant: renamedEnum(variants, renamedVariants).default(variants[0] as V[number] as never),
    settings: sectionSettingsSchema.default({}),
    props,
  });
}

/** A short fact under the About hero: "Based in" / "Cyprus". */
const fact = z.object({ id, label: requiredText(60), value: requiredText(80) });

const hero = section(
  "hero",
  // portrait_arch: her portrait on the left, the words on the right (home).
  // portrait_right: the words first, her portrait on the right (About).
  // photo: a 3:2 photograph beside the words. text_only: the words alone.
  ["portrait_arch", "portrait_right", "photo", "text_only"],
  z.object({
    title: requiredText(140),
    /** The hope word of the home h1, set in italic. Shown only on the home page. */
    accent: text(60),
    body: text(600),
    imageMediaId: optionalMediaId,
    caption: text(240),
    primary: optionalLink,
    secondary: optionalLink,
    /** Show "Listen to the audiobook" that jumps to the player on this page. */
    listenCta: z.boolean().default(false),
    facts: z.array(fact).max(3).default([]),
  }),
);

const audiobookPlayer = section(
  "audiobook_player",
  ["single", "shelf"],
  z.object({
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
    title: text(140),
    intro: text(400),
  }),
);

const bookExcerpts = section(
  "book_excerpts",
  ["cards", "stacked"],
  z.object({
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
    title: requiredText(140),
    body: text(500),
    buttonLabel: text(60),
  }),
);

const richText = section(
  "rich_text",
  // foreword: the heading on the left, the text on the right with a drop cap.
  ["one_column", "foreword"],
  z.object({
    title: text(140),
    body: rich(),
  }),
);

const twoColumn = section(
  "two_column",
  ["image_left", "image_right"],
  z.object({
    title: requiredText(140),
    lead: text(400),
    body: rich(20_000),
    imageMediaId: mediaId,
    caption: text(240),
    /** The section's one button. */
    primary: optionalLink,
    link: optionalLink,
    secondary: optionalLink,
  }),
);

const quote = section(
  "quote",
  // centred: one sentence centred under a hairline. statement: left-aligned (a mission).
  ["centred", "statement"],
  z.object({
    quote: requiredText(400),
    /** The title of the book or work it comes from, set as a citation. */
    source: text(120),
    /** A person or a caption, such as "My mission". */
    attribution: text(80),
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
    title: text(140),
    /** An album, or hand-picked images when albumId is empty. */
    albumId: id.nullable().default(null),
    imageMediaIds: z.array(mediaId).max(60).default([]),
  }),
);

const video = section(
  "video",
  // filmstrip: the newest film with Up next beside it (home). grid: a feature,
  // then 16:9 tiles (/videos). single: one film and its caption.
  ["single", "grid", "filmstrip"],
  z.object({
    title: text(140),
    /** For "single" and "grid"; "filmstrip" uses the newest synced videos. */
    videoIds: z.array(id).max(12).default([]),
    channelLink: optionalLink,
  }),
  { latest: "filmstrip" },
);

const latestPosts = section(
  "latest_posts",
  ["list", "grid"],
  z.object({
    title: text(140),
    categoryId: id.nullable().default(null),
    count: z.number().int().min(1).max(12).default(3),
    showCategories: z.boolean().default(true),
    /** The journal index: every post, `count` per page, filtered by ?category=. */
    paginate: z.boolean().default(false),
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
    title: text(140),
    items: z
      .array(
        z.object({
          id,
          label: text(40),
          title: requiredText(140),
          body: text(1200),
          /** A photograph shown as its own row after this one. */
          imageMediaId: optionalMediaId,
          caption: text(240),
          /** A line set large as its own row after this one. */
          pullQuote: text(200),
        }),
      )
      .min(1)
      .max(30),
    link: optionalLink,
  }),
);

const list = section(
  "list",
  ["numbered", "plain"],
  z.object({
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
    title: text(140),
    categoryId: id.nullable().default(null),
  }),
);

const masterclasses = section(
  "masterclasses",
  ["list", "cards"],
  z.object({ title: text(140), intro: text(400) }),
);

const events = section(
  "events",
  ["upcoming_list", "cards"],
  z.object({ title: text(140), showPast: z.boolean().default(true) }),
);

const press = section("press", ["logo_row", "list"], z.object({ title: text(140) }));

const mediaKit = section(
  "media_kit",
  ["default"],
  z.object({
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
    title: text(140),
    categoryId: id.nullable().default(null),
    count: z.number().int().min(1).max(24).default(6),
  }),
);

const donation = section(
  "donation",
  ["card", "band"],
  z.object({
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
  z.object({ title: requiredText(140), body: text(400) }),
);

const contactForm = section(
  "contact_form",
  ["default"],
  z.object({ title: text(140), body: text(600) }),
);

const faq = section(
  "faq",
  ["accordion"],
  z.object({
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
  z.object({
    title: requiredText(140),
    body: text(400),
    link,
    /** A text link beside the button. */
    secondary: optionalLink,
  }),
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

// ---------------------------------------------------------------------------
// Page rules, checked before a page is saved or published
// ---------------------------------------------------------------------------

/**
 * The home page's fixed opening: the hero, then the audiobook player directly
 * under it. The studio locks these two rows (no move, hide or delete).
 */
export const HOME_PINNED: readonly SectionType[] = ["hero", "audiobook_player"];

export const PAGE_ORDER_MESSAGES = {
  hero: "Hero: it opens the home page.",
  player: "Audiobook player: it stays directly under the hero.",
} as const;

/**
 * Why a page's sections cannot be saved or published as they are, or null.
 * Takes the stored sections (parsed or not), so the studio can check a draft
 * before it validates the rest.
 */
export function pageOrderProblem(kind: string, sections: readonly unknown[]): string | null {
  if (kind !== "home") return null;
  const visible = (index: number, type: SectionType) => {
    const s = sections[index] as { type?: unknown; settings?: { hidden?: unknown } } | undefined;
    return s?.type === type && s.settings?.hidden !== true;
  };
  if (!visible(0, HOME_PINNED[0])) return PAGE_ORDER_MESSAGES.hero;
  if (!visible(1, HOME_PINNED[1])) return PAGE_ORDER_MESSAGES.player;
  return null;
}

/**
 * Translatable fields per section type. Plain keys are props; `items[].x`
 * is field x of every item in the items array. Kinds: "text" is plain text,
 * "rich" is sanitised HTML.
 */
export const TRANSLATABLE: { [T in SectionType]: Record<string, "text" | "rich"> } = {
  hero: {
    title: "text",
    accent: "text",
    body: "text",
    caption: "text",
    "primary.label": "text",
    "secondary.label": "text",
    "facts[].label": "text",
    "facts[].value": "text",
  },
  audiobook_player: { title: "text", intro: "text" },
  featured_book: { quote: "text", quoteBy: "text" },
  book_list: { title: "text", intro: "text" },
  book_excerpts: {
    title: "text",
    "items[].label": "text",
    "items[].title": "text",
    "items[].excerpt": "text",
  },
  ebook_gate: { title: "text", body: "text", buttonLabel: "text" },
  rich_text: { title: "text", body: "rich" },
  two_column: {
    title: "text",
    lead: "text",
    body: "rich",
    caption: "text",
    "primary.label": "text",
    "link.label": "text",
    "secondary.label": "text",
  },
  quote: { quote: "text", source: "text", attribution: "text" },
  image: { caption: "text" },
  gallery: { title: "text" },
  video: { title: "text", "channelLink.label": "text" },
  latest_posts: { title: "text", "link.label": "text" },
  stats: { "items[].value": "text", "items[].label": "text" },
  timeline: {
    title: "text",
    "items[].label": "text",
    "items[].title": "text",
    "items[].body": "text",
    "items[].caption": "text",
    "items[].pullQuote": "text",
    "link.label": "text",
  },
  list: {
    title: "text",
    intro: "text",
    "items[].title": "text",
    "items[].body": "text",
  },
  testimonials: { title: "text" },
  products: { title: "text" },
  masterclasses: { title: "text", intro: "text" },
  events: { title: "text" },
  press: { title: "text" },
  media_kit: { title: "text", shortBio: "text", longBio: "rich" },
  foundation_stories: { title: "text" },
  donation: { title: "text", body: "text" },
  newsletter: { title: "text", body: "text" },
  contact_form: { title: "text", body: "text" },
  faq: { title: "text", "items[].question": "text", "items[].answer": "text" },
  call_to_action: {
    title: "text",
    body: "text",
    "link.label": "text",
    "secondary.label": "text",
  },
  link_list: { "items[].label": "text", "items[].description": "text" },
  embed: { title: "text" },
};
