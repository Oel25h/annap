/**
 * The managers, as configs for <Collection>: which table, which fields in
 * which groups, the children each item has, and the Greek entity it
 * translates as. Field keys are the tables' own columns.
 */
import { nextBookFile } from "@/lib/book-files";
import { moveToBucket } from "@/lib/media-upload";
import type { ChildConfig, CollectionConfig, FieldDef, Row } from "./collection";
import { clock, day } from "./format";
import type { Option } from "./kit";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const euro = (cents: unknown) =>
  cents === null || cents === undefined || cents === ""
    ? ""
    : `€${(Number(cents) / 100).toFixed(2)}`;
const label = (options: Option[], value: unknown) =>
  options.find((o) => o.value === String(value ?? ""))?.label ?? "";
const max = (rows: Row[], key: string) =>
  rows.reduce((m, r) => Math.max(m, Number(r[key] ?? 0)), 0);
const uniqueSlug = (base: string) => `${base}-${Date.now().toString(36)}`;

const STATUS3: Option[] = [
  { value: "draft", label: "Draft (not on the site)" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
];
const STATUS_WORD: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  hidden: "Hidden",
};
const status = (row: Row) => ({
  label: STATUS_WORD[str(row.status)] ?? str(row.status),
  live: row.status === "published",
});
const shown = (key: string) => (row: Row) => ({
  label: row[key] ? "Shown" : "Hidden",
  live: row[key] === true,
});
const LOCALES: Option[] = [
  { value: "en", label: "English" },
  { value: "el", label: "Greek" },
];
const statusFilter = {
  legend: "Show",
  options: [
    { value: "all", label: "All" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
    { value: "hidden", label: "Hidden" },
  ],
  test: (row: Row, v: string) => v === "all" || row.status === v,
};

const seo: FieldDef[] = [
  {
    kind: "text",
    key: "seo_title",
    label: "Search title",
    max: 70,
    hint: "Optional. Shown in search results instead of the title.",
  },
  {
    kind: "area",
    key: "seo_description",
    label: "Search description",
    rows: 2,
    hint: "One or two sentences for search results.",
  },
];

// ---------------------------------------------------------------------------
// Books, with their formats, free files and praise
// ---------------------------------------------------------------------------

const FORMATS: Option[] = [
  { value: "paperback", label: "Paperback" },
  { value: "hardcover", label: "Hardcover" },
  { value: "ebook", label: "eBook" },
  { value: "audiobook", label: "Audiobook" },
];

const bookFormats: ChildConfig = {
  table: "book_formats",
  fk: "book_id",
  title: "Formats and where to buy",
  noun: "format",
  hint: "Each format is sold here (a price, with Stripe connected) or at a retailer (a link). A paid eBook or audiobook needs its file, kept private.",
  position: "position",
  name: (r) =>
    [label(FORMATS, r.format), r.locale ? `(${label(LOCALES, r.locale)})` : ""]
      .filter(Boolean)
      .join(" "),
  meta: (r) =>
    [
      r.price_cents ? `${euro(r.price_cents)} here` : "",
      r.external_url ? `at ${str(r.retailer) || "a retailer"}` : "",
      r.available ? "" : "Unavailable",
    ]
      .filter(Boolean)
      .join(" · "),
  fields: [
    { kind: "select", key: "format", label: "Format", options: FORMATS },
    {
      kind: "select",
      key: "locale",
      label: "Language",
      options: LOCALES,
      nullable: "Both languages",
    },
    { kind: "money", key: "price_cents", label: "Price here" },
    {
      kind: "text",
      key: "stripe_price_id",
      label: "Stripe price id",
      hint: "Optional (price_…). Without one, the price above is used.",
    },
    { kind: "text", key: "retailer", label: "Retailer", hint: "Such as Amazon or Bookshop." },
    {
      kind: "text",
      key: "external_url",
      label: "Retailer link",
      type: "url",
      hint: "A full https:// address.",
    },
    { kind: "text", key: "isbn", label: "ISBN" },
    {
      kind: "media",
      key: "delivery_media_id",
      label: "File buyers receive",
      media: "document",
      access: "private",
      hint: "The eBook (ePub or PDF), kept private; buyers get an expiring link.",
    },
    { kind: "switch", key: "available", label: "Available", hint: "Off hides this format." },
  ],
  validate: (r) =>
    r.external_url && !/^https:\/\//.test(str(r.external_url))
      ? "The retailer link must start with https://."
      : null,
  create: (parent, rows) => ({
    book_id: parent?.id,
    format:
      FORMATS.find((f) => !rows.some((r) => r.format === f.value && !r.locale))?.value ??
      "paperback",
    locale: null,
    position: rows.length,
    available: false,
  }),
};

const bookFiles: ChildConfig = {
  table: "book_files",
  fk: "book_id",
  title: "Free downloads and samples",
  noun: "file",
  hint: "One free ebook per language, behind the name-and-email form. Open a language and choose a new file to replace it. The same steps work for every book.",
  name: (r) =>
    `${r.purpose === "sample" ? "Sample" : "Free download"} (${label(LOCALES, r.locale)})`,
  fields: [
    {
      kind: "select",
      key: "purpose",
      label: "Kind",
      options: [
        { value: "free_download", label: "Free download" },
        { value: "sample", label: "Sample" },
      ],
    },
    { kind: "select", key: "locale", label: "Language", options: LOCALES },
    {
      kind: "media",
      key: "media_id",
      label: "File",
      media: "document",
      access: "private",
      hint: "Choosing a new file replaces this one. The language on this row is the page that offers it.",
    },
  ],
  addWith: { key: "media_id", label: "File", kind: "document", access: "private" },
  create: (parent, rows) => ({
    book_id: parent?.id,
    ...nextBookFile(rows),
  }),
};

const bookReviews: ChildConfig = {
  table: "book_reviews",
  fk: "book_id",
  title: "Praise for this book",
  noun: "review",
  position: "sort_order",
  name: (r) => str(r.by_name) || "Unnamed",
  meta: (r) => (r.published ? str(r.source) : "Hidden"),
  fields: [
    { kind: "area", key: "quote", label: "Quote", rows: 3 },
    { kind: "text", key: "by_name", label: "Name" },
    { kind: "text", key: "source", label: "Source", hint: "Such as Amazon review." },
    { kind: "switch", key: "published", label: "Shown on the site" },
  ],
  create: (parent, rows) => ({
    book_id: parent?.id,
    by_name: "",
    quote: "",
    published: false,
    sort_order: rows.length,
  }),
};

export const BOOKS: CollectionConfig = {
  table: "books",
  route: "/admin/books",
  title: "Books",
  lead: "Each book's page, its formats and where to buy them, its free eBook and its praise.",
  noun: "book",
  name: (r) => str(r.title),
  meta: (r) => [str(r.slug) && `/books/${str(r.slug)}`, r.featured ? "Featured" : ""],
  thumb: "cover_media_id",
  status,
  order: [{ column: "sort_order" }],
  position: "sort_order",
  search: ["subtitle", "slug"],
  filter: statusFilter,
  greek: "book",
  publicHref: (r) => `/books/${str(r.slug)}`,
  groups: [
    {
      title: "Book",
      fields: [
        { kind: "text", key: "title", label: "Title", required: true, max: 120 },
        { kind: "text", key: "subtitle", label: "Subtitle", max: 160 },
        { kind: "slug", key: "slug", label: "Web address", from: "title" },
        { kind: "text", key: "tagline", label: "Tagline", max: 200 },
        { kind: "area", key: "description", label: "Description", rows: 6 },
        { kind: "area", key: "who_for", label: "Who it's for", rows: 3 },
        { kind: "media", key: "cover_media_id", label: "Cover", media: "image" },
      ],
    },
    {
      title: "On the site",
      fields: [
        { kind: "select", key: "status", label: "Status", options: STATUS3 },
        {
          kind: "switch",
          key: "featured",
          label: "Featured",
          hint: "Shown first where books are listed.",
        },
      ],
    },
    { title: "Search engines", fields: seo },
  ],
  validate: (r) =>
    !str(r.title).trim()
      ? "Give the book a title."
      : !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(str(r.slug))
        ? "The web address can use only lowercase letters, numbers and single hyphens."
        : null,
  create: (rows) => ({
    title: "New book",
    slug: uniqueSlug("new-book"),
    status: "draft",
    formats: [],
    sort_order: max(rows, "sort_order") + 10,
  }),
  children: [bookFormats, bookFiles, bookReviews],
};

// ---------------------------------------------------------------------------
// Audiobooks and their chapters
// ---------------------------------------------------------------------------

const chapters: ChildConfig = {
  table: "audiobook_tracks",
  fk: "audiobook_id",
  title: "Chapters",
  noun: "chapter",
  hint: "Free chapters stream to everyone. Paid chapters are kept private and play only for buyers; switching moves the file for you.",
  position: "position",
  name: (r) => str(r.title) || "Untitled chapter",
  meta: (r) =>
    [clock(r.duration_seconds as number), r.free_to_stream ? "Free" : "Paid"]
      .filter(Boolean)
      .join(" · "),
  fields: [
    { kind: "text", key: "title", label: "Title", max: 160 },
    {
      kind: "area",
      key: "opening_line",
      label: "Opening line",
      rows: 2,
      hint: "The first words of the chapter, shown under its title in the player.",
    },
    {
      kind: "switch",
      key: "free_to_stream",
      label: "Free to stream",
      hint: "Off: only buyers can play it, and the file moves to private downloads.",
    },
    {
      kind: "media",
      key: "audio_media_id",
      label: "Audio",
      media: "audio",
      access: (r) => (r.free_to_stream ? "public" : "private"),
      fill: (m) => (m.duration_seconds ? { duration_seconds: Number(m.duration_seconds) } : {}),
      hint: "MP3 or M4A. Uploads go to the right place for free or paid.",
    },
  ],
  beforeSave: async (row, patch) => {
    const free = (patch.free_to_stream ?? row.free_to_stream) === true;
    const media = (patch.audio_media_id ?? row.audio_media_id) as string | null;
    if (media && ("free_to_stream" in patch || "audio_media_id" in patch))
      await moveToBucket(media, free ? "audio" : "downloads");
    return patch;
  },
  create: (parent, rows) => ({
    audiobook_id: parent?.id,
    title: `Chapter ${rows.length + 1}`,
    position: rows.length,
    free_to_stream: true,
  }),
};

export const AUDIOBOOKS: CollectionConfig = {
  table: "audiobooks",
  route: "/admin/audiobooks",
  title: "Audiobooks",
  lead: "One edition per book and language, read in her own voice, with its chapters.",
  noun: "audiobook",
  name: (r) => str(r.title),
  meta: (r, l) => [label(LOCALES, r.locale), label(l.books ?? [], r.book_id), str(r.narrator)],
  thumb: "cover_media_id",
  status,
  order: [{ column: "position" }],
  position: "position",
  filter: statusFilter,
  lookups: { books: { table: "books", label: "title" } },
  groups: [
    {
      title: "Edition",
      fields: [
        { kind: "text", key: "title", label: "Title", max: 160 },
        { kind: "text", key: "subtitle", label: "Subtitle", max: 160 },
        { kind: "select", key: "book_id", label: "Book", options: "books", nullable: "No book" },
        { kind: "select", key: "locale", label: "Language", options: LOCALES },
        { kind: "text", key: "narrator", label: "Read by" },
        { kind: "area", key: "description", label: "Description", rows: 4 },
        { kind: "media", key: "cover_media_id", label: "Cover", media: "image" },
      ],
    },
    {
      title: "On the site",
      fields: [
        { kind: "select", key: "status", label: "Status", options: STATUS3 },
        {
          kind: "switch",
          key: "featured",
          label: "Featured",
          hint: "Plays in the home page's player.",
        },
      ],
    },
  ],
  create: (rows) => ({
    title: "New audiobook",
    locale: "en",
    status: "draft",
    position: max(rows, "position") + 1,
  }),
  children: [chapters],
};

// ---------------------------------------------------------------------------
// Stories (blog posts) and their categories
// ---------------------------------------------------------------------------

const categories = (table: string, title: string): ChildConfig => ({
  table,
  title,
  noun: "category",
  position: "sort_order",
  name: (r) => str(r.name) || "Unnamed",
  meta: (r) => str(r.slug),
  fields: [
    { kind: "text", key: "name", label: "Name", max: 60 },
    { kind: "slug", key: "slug", label: "Web address", from: "name" },
  ],
  validate: (r) =>
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str(r.slug))
      ? null
      : "The web address can use only lowercase letters, numbers and single hyphens.",
  create: (_p, rows) => ({
    name: "New category",
    slug: uniqueSlug("category"),
    sort_order: rows.length,
  }),
});

export const POSTS: CollectionConfig = {
  table: "blog_posts",
  route: "/admin/blog",
  title: "Stories",
  lead: "Her stories and letters: write, add a cover, choose a category and publish.",
  noun: "story",
  name: (r) => str(r.title),
  meta: (r, l) => [
    label(l.categories ?? [], r.category_id),
    day(str(r.published_at) || str(r.publish_date)),
    r.featured ? "Featured" : "",
  ],
  thumb: "cover_media_id",
  status,
  order: [{ column: "publish_date", ascending: false }],
  search: ["excerpt", "slug"],
  filter: {
    ...statusFilter,
    options: statusFilter.options.filter((o) => o.value !== "hidden"),
  },
  greek: "blog_post",
  publicHref: (r) => `/blog/${str(r.slug)}`,
  lookups: { categories: { table: "blog_categories", label: "name", order: "sort_order" } },
  groups: [
    {
      title: "Story",
      fields: [
        { kind: "text", key: "title", label: "Title", required: true, max: 140 },
        { kind: "slug", key: "slug", label: "Web address", from: "title" },
        {
          kind: "area",
          key: "excerpt",
          label: "Excerpt",
          rows: 3,
          hint: "One or two sentences for lists.",
        },
        { kind: "rich", key: "body", label: "Story" },
        { kind: "media", key: "cover_media_id", label: "Cover", media: "image" },
      ],
    },
    {
      title: "On the site",
      fields: [
        {
          kind: "select",
          key: "category_id",
          label: "Category",
          options: "categories",
          nullable: "No category",
        },
        { kind: "select", key: "status", label: "Status", options: STATUS3.slice(0, 2) },
        { kind: "date", key: "publish_date", label: "Date shown" },
        { kind: "number", key: "reading_minutes", label: "Minutes to read", min: 1 },
        { kind: "switch", key: "featured", label: "Featured" },
      ],
    },
    { title: "Search engines", fields: seo },
  ],
  validate: (r) =>
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(str(r.slug))
      ? "The web address can use only lowercase letters, numbers and single hyphens."
      : null,
  create: () => ({
    title: "New story",
    slug: uniqueSlug("new-story"),
    body: "",
    category: "",
    status: "draft",
    publish_date: new Date().toISOString().slice(0, 10),
  }),
  extras: [categories("blog_categories", "Story categories")],
};

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

export const PRODUCTS: CollectionConfig = {
  table: "products",
  route: "/admin/products",
  title: "Shop",
  lead: "Things she sells: sold here through Stripe when there's a price, or through a checkout link.",
  noun: "product",
  name: (r) => str(r.name),
  meta: (r, l) => [
    euro(r.price_cents) || str(r.price),
    label(l.categories ?? [], r.category_id),
    r.featured ? "Featured" : "",
  ],
  thumb: "cover_media_id",
  status,
  order: [{ column: "sort_order" }],
  position: "sort_order",
  search: ["slug", "description"],
  filter: statusFilter,
  greek: "product",
  publicHref: (r) => `/shop/${str(r.slug)}`,
  lookups: { categories: { table: "product_categories", label: "name", order: "sort_order" } },
  groups: [
    {
      title: "Product",
      fields: [
        { kind: "text", key: "name", label: "Name", required: true, max: 120 },
        { kind: "slug", key: "slug", label: "Web address", from: "name" },
        { kind: "area", key: "description", label: "Description", rows: 5 },
        { kind: "area", key: "who_for", label: "Who it's for", rows: 2 },
        {
          kind: "area",
          key: "included",
          label: "What's included",
          rows: 4,
          hint: "One item per line.",
        },
        { kind: "media", key: "cover_media_id", label: "Main photo", media: "image" },
      ],
    },
    {
      title: "Price and delivery",
      fields: [
        {
          kind: "select",
          key: "product_type",
          label: "Type",
          options: [
            { value: "digital", label: "Digital" },
            { value: "physical", label: "Physical" },
            { value: "ebook", label: "eBook" },
          ],
        },
        { kind: "money", key: "price_cents", label: "Price" },
        {
          kind: "money",
          key: "compare_at_cents",
          label: "Was (optional)",
          hint: "Shown crossed out beside the price.",
        },
        {
          kind: "text",
          key: "price",
          label: "Price wording",
          hint: "Optional, such as “From €12”. Used when there's no price above.",
        },
        {
          kind: "text",
          key: "stripe_price_id",
          label: "Stripe price id",
          hint: "Optional (price_…).",
        },
        {
          kind: "text",
          key: "checkout_url",
          label: "Checkout link",
          type: "url",
          hint: "Used when payments here are off: a full https:// address or a page on the site.",
        },
        { kind: "number", key: "stock", label: "In stock", min: 0, hint: "Empty means no limit." },
        {
          kind: "text",
          key: "stock_note",
          label: "Stock note",
          hint: "Such as “Ships in 3 days”.",
        },
        {
          kind: "media",
          key: "delivery_media_id",
          label: "File buyers receive",
          media: "document",
          access: "private",
          hint: "For digital products. Kept private; buyers get an expiring link.",
        },
      ],
    },
    {
      title: "On the site",
      fields: [
        {
          kind: "select",
          key: "category_id",
          label: "Category",
          options: "categories",
          nullable: "No category",
        },
        { kind: "select", key: "status", label: "Status", options: STATUS3 },
        { kind: "switch", key: "featured", label: "Featured" },
      ],
    },
    { title: "Search engines", fields: seo },
  ],
  create: (rows) => ({
    name: "New product",
    slug: uniqueSlug("new-product"),
    product_type: "digital",
    status: "draft",
    sort_order: max(rows, "sort_order") + 10,
  }),
  children: [
    {
      table: "product_images",
      fk: "product_id",
      title: "More photos",
      noun: "photo",
      position: "sort_order",
      name: (r) => (r.media_id ? "Photo" : "Photo (none chosen)"),
      fields: [{ kind: "media", key: "media_id", label: "Photo", media: "image" }],
      create: (parent, rows) => ({ product_id: parent?.id, sort_order: rows.length }),
    },
  ],
  extras: [categories("product_categories", "Shop categories")],
};

// ---------------------------------------------------------------------------
// Masterclasses, events, press
// ---------------------------------------------------------------------------

export const MASTERCLASSES: CollectionConfig = {
  table: "masterclasses",
  route: "/admin/masterclass",
  title: "Masterclasses",
  lead: "Courses and workshops, with how to join: an enrolment link, a shop product or a waitlist.",
  noun: "masterclass",
  name: (r) => str(r.title),
  meta: (r) => [
    day(str(r.starts_at)),
    str(r.price_label),
    str(r.availability) === "open"
      ? "Open"
      : str(r.availability) === "waitlist"
        ? "Waitlist"
        : "Closed",
  ],
  thumb: "cover_media_id",
  status,
  order: [{ column: "position" }],
  position: "position",
  filter: statusFilter,
  greek: "masterclass",
  publicHref: (r) => `/masterclasses/${str(r.slug)}`,
  lookups: { products: { table: "products", label: "name" } },
  groups: [
    {
      title: "Masterclass",
      fields: [
        { kind: "text", key: "title", label: "Title", required: true, max: 140 },
        { kind: "slug", key: "slug", label: "Web address", from: "title" },
        { kind: "area", key: "summary", label: "Summary", rows: 2 },
        { kind: "area", key: "description", label: "Description", rows: 6 },
        {
          kind: "area",
          key: "included",
          label: "What's included",
          rows: 4,
          hint: "One item per line.",
        },
        { kind: "media", key: "cover_media_id", label: "Cover", media: "image" },
      ],
    },
    {
      title: "When and where",
      fields: [
        { kind: "datetime", key: "starts_at", label: "Starts" },
        { kind: "datetime", key: "ends_at", label: "Ends" },
        {
          kind: "text",
          key: "schedule_note",
          label: "Schedule note",
          hint: "Such as “Six Tuesdays, 7pm Cyprus time”.",
        },
        {
          kind: "select",
          key: "format",
          label: "Format",
          options: [
            { value: "online", label: "Online" },
            { value: "in_person", label: "In person" },
            { value: "hybrid", label: "Online and in person" },
          ],
        },
        { kind: "text", key: "location", label: "Location" },
      ],
    },
    {
      title: "Joining",
      fields: [
        { kind: "text", key: "price_label", label: "Price wording", hint: "Such as €180 or Free." },
        {
          kind: "select",
          key: "availability",
          label: "Places",
          options: [
            { value: "open", label: "Open to join" },
            { value: "waitlist", label: "Waitlist" },
            { value: "closed", label: "Closed" },
          ],
        },
        {
          kind: "text",
          key: "enrol_url",
          label: "Enrolment link",
          type: "url",
          hint: "A full https:// address or a page on the site.",
        },
        {
          kind: "select",
          key: "enrol_product_id",
          label: "Or sell as a product",
          options: "products",
          nullable: "No product",
        },
        { kind: "select", key: "status", label: "Status", options: STATUS3 },
      ],
    },
    { title: "Search engines", fields: seo },
  ],
  validate: (r) =>
    r.enrol_url && !/^(\/|https:\/\/)/.test(str(r.enrol_url))
      ? "The enrolment link must start with https:// or /."
      : null,
  create: (rows) => ({
    title: "New masterclass",
    slug: uniqueSlug("masterclass"),
    status: "draft",
    position: max(rows, "position") + 1,
  }),
};

export const EVENTS: CollectionConfig = {
  table: "events",
  route: "/admin/events",
  title: "Events",
  lead: "Talks, readings and signings. Past events move to the archive by themselves.",
  noun: "event",
  name: (r) => str(r.title),
  meta: (r) => [
    day(str(r.starts_at)),
    r.online ? "Online" : [str(r.venue), str(r.city)].filter(Boolean).join(", "),
  ],
  thumb: "cover_media_id",
  status,
  order: [{ column: "starts_at", ascending: false }],
  filter: statusFilter,
  greek: "event",
  publicHref: (r) => `/events/${str(r.slug)}`,
  groups: [
    {
      title: "Event",
      fields: [
        { kind: "text", key: "title", label: "Title", required: true, max: 140 },
        { kind: "slug", key: "slug", label: "Web address", from: "title" },
        { kind: "area", key: "summary", label: "Summary", rows: 3 },
        { kind: "media", key: "cover_media_id", label: "Photo", media: "image" },
      ],
    },
    {
      title: "When and where",
      fields: [
        { kind: "datetime", key: "starts_at", label: "Starts" },
        { kind: "datetime", key: "ends_at", label: "Ends" },
        {
          kind: "text",
          key: "time_zone",
          label: "Time zone",
          hint: "Such as Asia/Nicosia. Times on the site show in it.",
        },
        { kind: "switch", key: "online", label: "Online" },
        { kind: "text", key: "venue", label: "Venue" },
        { kind: "text", key: "city", label: "City" },
        {
          kind: "text",
          key: "ticket_url",
          label: "Tickets link",
          type: "url",
          hint: "A full https:// address.",
        },
        { kind: "select", key: "status", label: "Status", options: STATUS3 },
      ],
    },
    { title: "Search engines", fields: seo },
  ],
  validate: (r) =>
    r.ticket_url && !/^https:\/\//.test(str(r.ticket_url))
      ? "The tickets link must start with https://."
      : !r.starts_at
        ? "Add when it starts."
        : null,
  create: () => ({
    title: "New event",
    slug: uniqueSlug("event"),
    status: "draft",
    starts_at: new Date(Date.now() + 30 * 864e5).toISOString(),
  }),
};

export const PRESS: CollectionConfig = {
  table: "press_mentions",
  route: "/admin/press",
  title: "Press",
  lead: "Interviews and articles about her work.",
  noun: "mention",
  name: (r) => str(r.headline) || str(r.outlet),
  meta: (r) => [str(r.outlet), day(str(r.published_on))],
  thumb: "logo_media_id",
  status: shown("published"),
  order: [{ column: "position" }],
  position: "position",
  groups: [
    {
      title: "Mention",
      fields: [
        { kind: "text", key: "outlet", label: "Outlet", hint: "Such as Cyprus Mail." },
        { kind: "text", key: "headline", label: "Headline" },
        { kind: "date", key: "published_on", label: "Date" },
        { kind: "text", key: "url", label: "Link", type: "url", hint: "A full https:// address." },
        { kind: "media", key: "logo_media_id", label: "Logo", media: "image" },
        { kind: "switch", key: "published", label: "Shown on the site" },
      ],
    },
  ],
  validate: (r) =>
    r.url && !/^https:\/\//.test(str(r.url)) ? "The link must start with https://." : null,
  create: (rows) => ({
    outlet: "New outlet",
    headline: "",
    published: false,
    position: max(rows, "position") + 1,
  }),
};

// ---------------------------------------------------------------------------
// Foundation stories, praise, gallery
// ---------------------------------------------------------------------------

export const FOUNDATION: CollectionConfig = {
  table: "foundation_stories",
  route: "/admin/foundation",
  title: "Foundation stories",
  lead: "The people the foundation helps. A story about a real person needs their consent before it's published.",
  noun: "story",
  name: (r) => str(r.title),
  meta: (r) => [str(r.person_name), str(r.category), r.featured ? "Top story" : ""],
  thumb: "cover_media_id",
  status,
  order: [{ column: "sort_order" }],
  position: "sort_order",
  search: ["person_name", "category"],
  filter: statusFilter,
  greek: "foundation_story",
  publicHref: (r) => `/foundation/stories/${str(r.slug)}`,
  lookups: {
    categories: {
      table: "foundation_categories",
      label: "name",
      value: "name",
      order: "sort_order",
    },
  },
  groups: [
    {
      title: "Story",
      fields: [
        { kind: "text", key: "title", label: "Title", required: true, max: 140 },
        { kind: "slug", key: "slug", label: "Web address", from: "title" },
        { kind: "text", key: "person_name", label: "Person or family" },
        { kind: "text", key: "location", label: "Where", hint: "Optional." },
        { kind: "select", key: "category", label: "Category", options: "categories" },
        { kind: "area", key: "summary", label: "Summary", rows: 3 },
        { kind: "rich", key: "body", label: "Story" },
        { kind: "media", key: "cover_media_id", label: "Photo", media: "image" },
      ],
    },
    {
      title: "Consent and visibility",
      fields: [
        {
          kind: "switch",
          key: "consent_recorded",
          label: "Consent recorded",
          hint: "They agreed, in writing, to this story being published.",
        },
        {
          kind: "switch",
          key: "anonymise",
          label: "Keep them anonymous",
          hint: "Shows the first name only and no face photos.",
        },
        { kind: "select", key: "status", label: "Status", options: STATUS3 },
        { kind: "switch", key: "featured", label: "Top story" },
      ],
    },
    { title: "Search engines", fields: seo },
  ],
  validate: (r) =>
    r.status === "published" && !r.consent_recorded
      ? "Record their consent before publishing this story."
      : null,
  create: (rows) => ({
    title: "New story",
    slug: uniqueSlug("story"),
    person_name: "",
    body: "",
    category: "",
    status: "draft",
    sort_order: max(rows, "sort_order") + 10,
  }),
  extras: [categories("foundation_categories", "Foundation categories")],
};

export const TESTIMONIALS: CollectionConfig = {
  table: "testimonials",
  route: "/admin/testimonials",
  title: "Praise",
  lead: "What readers say. Each one stays hidden until she has confirmed it.",
  noun: "testimonial",
  name: (r) => str(r.name) || "Unnamed",
  meta: (r, l) => [str(r.role), label(l.books ?? [], r.book_id)],
  thumb: "photo_media_id",
  status: shown("published"),
  order: [{ column: "position" }],
  position: "position",
  search: ["quote"],
  greek: "testimonial",
  lookups: { books: { table: "books", label: "title" } },
  groups: [
    {
      title: "Testimonial",
      fields: [
        { kind: "area", key: "quote", label: "Quote", rows: 4 },
        { kind: "text", key: "name", label: "Name" },
        { kind: "text", key: "role", label: "Who they are", hint: "Such as Reader, Limassol." },
        {
          kind: "select",
          key: "book_id",
          label: "About the book",
          options: "books",
          nullable: "No book",
        },
        { kind: "media", key: "photo_media_id", label: "Photo", media: "image" },
        { kind: "switch", key: "published", label: "Shown on the site" },
      ],
    },
  ],
  create: (rows) => ({
    quote: "",
    name: "",
    published: false,
    position: max(rows, "position") + 1,
  }),
};

export const GALLERY: CollectionConfig = {
  table: "gallery_sections",
  route: "/admin/gallery",
  title: "Gallery",
  lead: "Albums of photos. Open an album to add photos, captions and their order.",
  noun: "album",
  name: (r) => str(r.name),
  meta: (r) => [str(r.slug)],
  thumb: "cover_media_id",
  status: shown("published"),
  order: [{ column: "sort_order" }],
  position: "sort_order",
  groups: [
    {
      title: "Album",
      fields: [
        { kind: "text", key: "name", label: "Name", max: 80 },
        { kind: "slug", key: "slug", label: "Web address", from: "name" },
        { kind: "area", key: "description", label: "Description", rows: 3 },
        { kind: "media", key: "cover_media_id", label: "Cover", media: "image" },
        { kind: "switch", key: "published", label: "Shown on the site" },
      ],
    },
  ],
  create: (rows) => ({
    name: "New album",
    slug: uniqueSlug("album"),
    published: false,
    sort_order: max(rows, "sort_order") + 10,
  }),
  children: [
    {
      table: "gallery_images",
      fk: "section_id",
      title: "Photos",
      noun: "photo",
      position: "sort_order",
      name: (r) => str(r.caption) || "Photo",
      meta: (r) => (r.published ? str(r.chapter) : "Hidden"),
      fields: [
        { kind: "media", key: "media_id", label: "Photo", media: "image" },
        { kind: "area", key: "caption", label: "Caption", rows: 2 },
        {
          kind: "text",
          key: "chapter",
          label: "Chapter",
          hint: "A short heading photos are grouped under.",
        },
        { kind: "switch", key: "published", label: "Shown on the site" },
      ],
      create: (parent, rows) => ({
        section_id: parent?.id,
        chapter: str(parent?.name),
        caption: "",
        published: true,
        sort_order: rows.length,
      }),
    },
  ],
};
