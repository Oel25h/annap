/**
 * Loaders for the sections that list collection items. Each runs one query
 * for its items (plus one for approved Greek on Greek pages, and the stories'
 * theme counts or the shop's payment setting where a list needs them).
 */
import type { Locale } from "@/lib/i18n/locale";
import type { SectionOf } from "@/sections/schemas";
import type {
  AudiobookItem,
  EventCard,
  MasterclassCard,
  PostCard,
  PressItem,
  ProductCard,
  SectionDataMap,
  StoryCard,
  TestimonialItem,
  VideoCard,
} from "@/sections/types";
import { loadBooks } from "./books.server";
import {
  itemOverlays,
  overlayFields,
  publicIntegrations,
  type LoaderContext,
} from "./common.server";

type Loader<T extends keyof SectionDataMap> = (
  ctx: LoaderContext,
  sections: SectionOf<T>[],
) => Promise<Map<string, SectionDataMap[T]>>;

/** One book per section (featured book, free-ebook form). Sections whose book is unpublished get nothing. */
function singleBook<T extends "featured_book" | "ebook_gate">(): Loader<T> {
  return async (ctx, sections) => {
    const books = await loadBooks(ctx, [...new Set(sections.map((s) => s.props.bookId))]);
    const byId = new Map(books.map((b) => [b.id, b]));
    const out = new Map<string, SectionDataMap[T]>();
    for (const section of sections) {
      const book = byId.get(section.props.bookId);
      if (book) out.set(section.id, { book } as SectionDataMap[T]);
    }
    return out;
  };
}

export const featuredBook = singleBook<"featured_book">();
export const ebookGate = singleBook<"ebook_gate">();

export const bookList: Loader<"book_list"> = async (ctx, sections) => {
  const books = await loadBooks(ctx);
  return new Map(sections.map((s) => [s.id, { books }]));
};

export const bookExcerpts: Loader<"book_excerpts"> = async (ctx, sections) => {
  const ids = sections.map((s) => s.props.bookId).filter((id): id is string => !!id);
  const books = ids.length ? await loadBooks(ctx, [...new Set(ids)]) : [];
  const byId = new Map(books.map((b) => [b.id, { slug: b.slug, title: b.title }]));
  return new Map(
    sections.map((s) => [
      s.id,
      { book: s.props.bookId ? (byId.get(s.props.bookId) ?? null) : null },
    ]),
  );
};

type AudiobookFormatRow = {
  format: string;
  locale: string | null;
  external_url: string | null;
  available: boolean;
};

/**
 * Where a recording is sold whole: its book's audiobook retailer link, in the
 * recording's language first, then one for any language, then the English one.
 */
function fullRecordingUrl(formats: AudiobookFormatRow[], locale: Locale): string | null {
  const rows = formats.filter(
    (f) => f.format === "audiobook" && f.available && /^https:\/\//i.test(f.external_url ?? ""),
  );
  const pick =
    rows.find((f) => f.locale === locale) ??
    rows.find((f) => f.locale === null) ??
    rows.find((f) => f.locale === "en");
  return pick?.external_url ?? null;
}

/**
 * The editions a page offers: every book once, in the page's language when it
 * is recorded in it, otherwise in the other language (labelled as such). The
 * page's own language comes first, so /el lists the Greek edition first and
 * the English-only books after it.
 */
export const audiobookPlayer: Loader<"audiobook_player"> = async (ctx, sections) => {
  const { data, error } = await ctx.db
    .from("audiobooks")
    .select(
      "id, locale, title, subtitle, narrator, cover_media_id, position, book_id, book:books(slug, book_formats(format, locale, external_url, available)), audiobook_tracks(id, title, opening_line, audio_media_id, duration_seconds, free_to_stream, position)",
    )
    .order("position");
  if (error) throw new Error(`Audiobooks: ${error.message}`);
  const all: AudiobookItem[] = (data ?? []).map((row) => {
    const locale = row.locale === "el" ? "el" : "en";
    const book = row.book as { slug: string; book_formats: AudiobookFormatRow[] } | null;
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? "",
      narrator: row.narrator ?? "",
      coverMediaId: row.cover_media_id,
      locale,
      bookId: row.book_id,
      bookSlug: book?.slug ?? null,
      fullUrl: fullRecordingUrl(book?.book_formats ?? [], locale),
      tracks: [...row.audiobook_tracks]
        .sort((a, b) => a.position - b.position)
        .map((t) => ({
          id: t.id,
          title: t.title,
          audioMediaId: t.free_to_stream ? t.audio_media_id : null,
          durationSeconds: t.duration_seconds === null ? null : Number(t.duration_seconds),
          openingLine: t.opening_line,
        })),
    };
  });
  const playable = all.filter((a) => a.tracks.some((t) => t.audioMediaId));
  const own = playable.filter((a) => a.locale === ctx.locale);
  const ownBooks = new Set(own.map((a) => a.bookId).filter(Boolean));
  const others = playable.filter(
    (a) => a.locale !== ctx.locale && !(a.bookId && ownBooks.has(a.bookId)),
  );
  const pool = [...own, ...others];
  const onlyOtherLanguage = own.length === 0;
  // The studio's order, with the page's own language first.
  const ownFirst = (a: AudiobookItem) => (a.locale === ctx.locale ? 0 : 1);

  return new Map(
    sections.map((section) => {
      const chosen = section.props.audiobookIds.length
        ? section.props.audiobookIds
            .map((id) => pool.find((a) => a.id === id))
            .filter((a): a is AudiobookItem => !!a)
            .sort((a, b) => ownFirst(a) - ownFirst(b))
        : pool;
      return [section.id, { audiobooks: chosen, onlyOtherLanguage }];
    }),
  );
};

const POST_CARD_COLUMNS =
  "id, slug, title, excerpt, published_at, publish_date, reading_minutes, cover_media_id, category:blog_categories(id, slug, name)";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  publish_date: string | null;
  reading_minutes: number | null;
  cover_media_id: string | null;
  category: unknown;
};

type Category = { id: string; slug: string; name: string };

/** The fields whose approved Greek makes a post Greek. */
export const POST_TEXT = ["title", "excerpt"] as const;

/** Journal categories in shelf order, with approved Greek names on Greek pages. */
export async function postCategories(ctx: LoaderContext): Promise<Category[]> {
  const { data, error } = await ctx.db
    .from("blog_categories")
    .select("id, slug, name")
    .order("sort_order");
  if (error) throw new Error(`Categories: ${error.message}`);
  const rows = data ?? [];
  const greek = await itemOverlays(
    ctx,
    "blog_category",
    rows.map((c) => c.id),
  );
  return rows.map((c) => ({
    ...c,
    name: overlayFields({ name: c.name }, greek, "blog_category", c.id, ["name"]).item.name,
  }));
}

/** Cards for post rows, with approved Greek titles and excerpts on Greek pages. */
export async function postCards(
  ctx: LoaderContext,
  rows: PostRow[],
  categories: Category[],
): Promise<(PostCard & { categoryId: string | null })[]> {
  const greek = await itemOverlays(
    ctx,
    "blog_post",
    rows.map((r) => r.id),
  );
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return rows.map((row) => {
    const { item, lang } = overlayFields(
      { title: row.title, excerpt: row.excerpt ?? "" },
      greek,
      "blog_post",
      row.id,
      POST_TEXT,
    );
    const category = row.category as Category | null;
    return {
      id: row.id,
      slug: row.slug,
      ...item,
      category: category
        ? { slug: category.slug, name: names.get(category.id) ?? category.name }
        : null,
      categoryId: category?.id ?? null,
      publishedAt: row.published_at ?? row.publish_date,
      readingMinutes: row.reading_minutes,
      coverMediaId: row.cover_media_id,
      textLang: lang,
    };
  });
}

/** Ids of the items of one type that have approved Greek. */
export async function greekIds(ctx: LoaderContext, entityType: string): Promise<string[]> {
  if (ctx.locale !== "el") return [];
  const { data, error } = await ctx.db
    .from("content_translations")
    .select("entity_id")
    .eq("entity_type", entityType)
    .eq("locale", "el")
    .eq("status", "approved");
  if (error) throw new Error(`Greek ids: ${error.message}`);
  return (data ?? []).map((r) => r.entity_id);
}

const strip = ({ categoryId: _drop, ...card }: PostCard & { categoryId: string | null }) => card;

type Themes = SectionDataMap["latest_posts"]["categories"];

/**
 * The themes in shelf order, each with how many stories the index lists in
 * it, so an empty theme can point to one that has some. `greek` is the
 * index's Greek-only filter (empty on English pages, and until a post is
 * translated).
 */
async function themeCounts(
  ctx: LoaderContext,
  categories: Category[],
  greek: string[],
): Promise<Themes> {
  let query = ctx.db.from("blog_posts").select("category_id");
  if (greek.length > 0) query = query.in("id", greek);
  const { data, error } = await query;
  if (error) throw new Error(`Theme counts: ${error.message}`);
  const counts = new Map<string, number>();
  for (const { category_id: id } of data ?? []) {
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return categories.map(({ id, slug, name }) => ({ slug, name, count: counts.get(id) ?? 0 }));
}

/** The journal index: one page of posts, newest first, optionally in one theme. */
async function postPage(
  ctx: LoaderContext,
  size: number,
  categories: Category[],
  greek: string[],
): Promise<Pick<SectionDataMap["latest_posts"], "posts" | "pagination">> {
  const requested = ctx.query?.page ?? 1;
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const category = categories.find((c) => c.slug === ctx.query?.category) ?? null;
  let query = ctx.db
    .from("blog_posts")
    .select(POST_CARD_COLUMNS, { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false })
    // A tiebreak, so posts published at the same moment never repeat or skip across pages.
    .order("id")
    .range((page - 1) * size, page * size - 1);
  if (category) query = query.eq("category_id", category.id);
  if (greek.length > 0) query = query.in("id", greek);
  const { data, error, count } = await query;
  // A page past the last one: the database refuses the range, and the page is a 404.
  if (error?.code === "PGRST103") {
    return {
      posts: [],
      pagination: {
        page,
        pages: 0,
        category: category?.slug ?? null,
        categoryName: category?.name ?? null,
      },
    };
  }
  if (error) throw new Error(`Posts: ${error.message}`);
  const cards = await postCards(ctx, (data ?? []) as PostRow[], categories);
  return {
    posts: cards.map(strip),
    pagination: {
      page,
      pages: Math.max(1, Math.ceil((count ?? 0) / size)),
      category: category?.slug ?? null,
      categoryName: category?.name ?? null,
    },
  };
}

/**
 * Stories: the latest (the owner's featured stories first, then the newest)
 * or, with `paginate`, the journal index.
 */
export const latestPosts: Loader<"latest_posts"> = async (ctx, sections) => {
  const indexed = sections.some((s) => s.props.paginate || s.props.showCategories);
  // On a Greek page the index lists Greek posts; English ones only if none are translated.
  const [categories, greek] = await Promise.all([
    postCategories(ctx),
    indexed ? greekIds(ctx, "blog_post") : [],
  ]);
  const themes = sections.some((s) => s.props.showCategories)
    ? await themeCounts(ctx, categories, greek)
    : [];
  // One pool per theme the listed sections ask for (null: all themes), filtered in the
  // query, so a theme whose stories are older still fills its section.
  const counts = new Map<string | null, number>();
  for (const s of sections) {
    if (s.props.paginate) continue;
    const key = s.props.categoryId ?? null;
    counts.set(key, Math.max(counts.get(key) ?? 0, s.props.count));
  }
  const pools = new Map<string | null, (PostCard & { categoryId: string | null })[]>(
    await Promise.all(
      [...counts].map(async ([key, max]) => {
        let query = ctx.db
          .from("blog_posts")
          .select(POST_CARD_COLUMNS)
          .order("featured", { ascending: false })
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("id")
          .limit(Math.min(max * 3, 36));
        if (key) query = query.eq("category_id", key);
        const { data, error } = await query;
        if (error) throw new Error(`Posts: ${error.message}`);
        const cards = await postCards(ctx, (data ?? []) as PostRow[], categories);
        const greekCards = cards.filter((c) => c.textLang === "el");
        return [key, ctx.locale === "el" && greekCards.length > 0 ? greekCards : cards] as const;
      }),
    ),
  );

  const out = new Map<string, SectionDataMap["latest_posts"]>();
  for (const section of sections) {
    const shown = section.props.showCategories ? themes : [];
    if (section.props.paginate) {
      const data = await postPage(ctx, section.props.count, categories, greek);
      out.set(section.id, { ...data, categories: shown });
      continue;
    }
    const posts = (pools.get(section.props.categoryId ?? null) ?? [])
      .slice(0, section.props.count)
      .map(strip);
    out.set(section.id, { posts, categories: shown, pagination: null });
  }
  return out;
};

/** How many videos each layout shows: the feature and three up next; one; a grid of cards. */
const VIDEO_COUNT: Record<string, number> = { filmstrip: 4, single: 1, grid: 12 };

/**
 * The newest videos (an owner's featured pick first), with approved Greek
 * titles on Greek pages. A section without its own channel link points at
 * the site's YouTube social link.
 */
export const video: Loader<"video"> = async (ctx, sections) => {
  const needsChannel = sections.some((s) => !s.props.channelLink.href);
  const [{ data, error }, socials] = await Promise.all([
    ctx.db
      .from("videos")
      .select(
        "id, youtube_id, title, description, duration_seconds, published_at, thumbnail_media_id, featured, position",
      )
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(48),
    needsChannel
      ? ctx.db
          .from("social_links")
          .select("url")
          .eq("platform", "youtube")
          .eq("enabled", true)
          .order("position")
      : null,
  ]);
  if (error) throw new Error(`Videos: ${error.message}`);
  const channelUrl = socials?.data?.find((s) => /^https:\/\//i.test(s.url))?.url ?? null;
  const rows = data ?? [];
  const greek = await itemOverlays(
    ctx,
    "video",
    rows.map((r) => r.id),
  );
  const cards: VideoCard[] = rows.map((row) => {
    const { item, lang } = overlayFields(
      { title: row.title, description: row.description ?? "" },
      greek,
      "video",
      row.id,
      ["title", "description"],
    );
    return {
      id: row.id,
      youtubeId: row.youtube_id,
      ...item,
      durationSeconds: row.duration_seconds,
      publishedAt: row.published_at,
      thumbnailMediaId: row.thumbnail_media_id,
      textLang: lang,
    };
  });
  return new Map(
    sections.map((section) => {
      const picked =
        section.variant !== "filmstrip" && section.props.videoIds.length
          ? section.props.videoIds
              .map((id) => cards.find((c) => c.id === id))
              .filter((c): c is VideoCard => !!c)
          : cards;
      return [
        section.id,
        {
          videos: picked.slice(0, VIDEO_COUNT[section.variant] ?? VIDEO_COUNT.filmstrip),
          channelUrl: section.props.channelLink.href ? null : channelUrl,
        },
      ];
    }),
  );
};

export const testimonials: Loader<"testimonials"> = async (ctx, sections) => {
  const { data, error } = await ctx.db
    .from("testimonials")
    .select("id, quote, name, role, book_id, photo_media_id, position")
    .order("position");
  if (error) throw new Error(`Testimonials: ${error.message}`);
  const rows = data ?? [];
  const greek = await itemOverlays(
    ctx,
    "testimonial",
    rows.map((r) => r.id),
  );
  const items = rows.map((row) => {
    const { item, lang } = overlayFields(
      { quote: row.quote, name: row.name, role: row.role ?? "" },
      greek,
      "testimonial",
      row.id,
      ["quote", "name", "role"],
    );
    return {
      bookId: row.book_id,
      value: {
        id: row.id,
        quote: item.quote,
        name: item.name,
        role: item.role,
        photoMediaId: row.photo_media_id,
        textLang: lang,
      } satisfies TestimonialItem,
    };
  });
  return new Map(
    sections.map((section) => {
      const picked = section.props.testimonialIds.length
        ? section.props.testimonialIds
            .map((id) => items.find((i) => i.value.id === id)?.value)
            .filter((i): i is TestimonialItem => !!i)
        : items
            .filter((i) => !section.props.bookId || i.bookId === section.props.bookId)
            .map((i) => i.value);
      return [section.id, { items: picked }];
    }),
  );
};

export const gallery: Loader<"gallery"> = async (ctx, sections) => {
  const albums = [
    ...new Set(sections.map((s) => s.props.albumId).filter((id): id is string => !!id)),
  ];
  const byAlbum = new Map<string, string[]>();
  if (albums.length) {
    const { data, error } = await ctx.db
      .from("gallery_images")
      .select("section_id, media_id, sort_order")
      .in("section_id", albums)
      .order("sort_order");
    if (error) throw new Error(`Gallery: ${error.message}`);
    for (const row of data ?? []) {
      if (!row.media_id || !row.section_id) continue;
      byAlbum.set(row.section_id, [...(byAlbum.get(row.section_id) ?? []), row.media_id]);
    }
  }
  return new Map(
    sections.map((s) => [
      s.id,
      {
        imageMediaIds: s.props.albumId
          ? (byAlbum.get(s.props.albumId) ?? [])
          : s.props.imageMediaIds,
      },
    ]),
  );
};

export const donation: Loader<"donation"> = async (ctx, sections) => {
  const { payments } = await publicIntegrations(ctx);
  return new Map(sections.map((s) => [s.id, { payments }]));
};

/** A path on this site (not `//host`), or null. */
const sitePath = (value: string | null) =>
  value && /^\/(?!\/)\S*$/.test(value.trim()) ? value.trim() : null;

export const products: Loader<"products"> = async (ctx, sections) => {
  const [{ data, error }, { payments }] = await Promise.all([
    ctx.db
      .from("products")
      .select(
        "id, slug, name, description, who_for, product_type, price_cents, price, currency, checkout_url, cover_media_id, category_id, featured, sort_order",
      )
      .order("featured", { ascending: false })
      .order("sort_order"),
    publicIntegrations(ctx),
  ]);
  if (error) throw new Error(`Products: ${error.message}`);
  const rows = data ?? [];
  const greek = await itemOverlays(
    ctx,
    "product",
    rows.map((r) => r.id),
  );
  const cards = rows.map((row) => {
    const { item, lang } = overlayFields(
      { name: row.name, summary: row.who_for || firstSentence(row.description ?? "") },
      greek,
      "product",
      row.id,
      ["name", "summary"],
    );
    return {
      categoryId: row.category_id,
      card: {
        id: row.id,
        slug: row.slug,
        ...item,
        productType: row.product_type,
        priceCents: row.price_cents,
        currency: row.currency || "EUR",
        priceLabel: row.price ?? "",
        coverMediaId: row.cover_media_id,
        textLang: lang,
        // As on the product's own page: sold here when payments are on and it has a price.
        checkoutUrl:
          payments && row.price_cents !== null && row.price_cents > 0
            ? null
            : sitePath(row.checkout_url),
      } satisfies ProductCard,
    };
  });
  return new Map(
    sections.map((s) => [
      s.id,
      {
        products: cards
          .filter((c) => !s.props.categoryId || c.categoryId === s.props.categoryId)
          .map((c) => c.card),
      },
    ]),
  );
};

export const masterclasses: Loader<"masterclasses"> = async (ctx, sections) => {
  const { data, error } = await ctx.db
    .from("masterclasses")
    .select(
      "id, slug, title, summary, starts_at, schedule_note, format, location, price_label, availability, cover_media_id, position",
    )
    .order("position");
  if (error) throw new Error(`Masterclasses: ${error.message}`);
  const rows = data ?? [];
  const greek = await itemOverlays(
    ctx,
    "masterclass",
    rows.map((r) => r.id),
  );
  const items: MasterclassCard[] = rows.map((row) => {
    const { item, lang } = overlayFields(
      { title: row.title, summary: row.summary, scheduleNote: row.schedule_note },
      greek,
      "masterclass",
      row.id,
      ["title", "summary", "scheduleNote"],
    );
    return {
      id: row.id,
      slug: row.slug,
      ...item,
      startsAt: row.starts_at,
      format:
        (["online", "in_person", "hybrid"] as const).find((f) => f === row.format) ?? "online",
      location: row.location,
      priceLabel: row.price_label,
      availability:
        (["open", "waitlist", "closed"] as const).find((a) => a === row.availability) ?? "open",
      coverMediaId: row.cover_media_id,
      textLang: lang,
    };
  });
  return new Map(sections.map((s) => [s.id, { items }]));
};

const EVENT_COLUMNS =
  "id, slug, title, summary, starts_at, ends_at, time_zone, online, venue, city, ticket_url, cover_media_id";

export const events: Loader<"events"> = async (ctx, sections) => {
  // An event has ended once its end (or, without one, its start) has passed, so an
  // event in progress stays upcoming. Two queries, so a long history never crowds
  // out what is coming.
  const now = `"${new Date().toISOString()}"`;
  const wantPast = sections.some((s) => s.props.showPast);
  const [up, ended] = await Promise.all([
    ctx.db
      .from("events")
      .select(EVENT_COLUMNS)
      .or(`ends_at.gte.${now},and(ends_at.is.null,starts_at.gte.${now})`)
      .order("starts_at", { ascending: true })
      .order("id")
      .limit(60),
    wantPast
      ? ctx.db
          .from("events")
          .select(EVENT_COLUMNS)
          .or(`ends_at.lt.${now},and(ends_at.is.null,starts_at.lt.${now})`)
          .order("starts_at", { ascending: false })
          .order("id")
          .limit(12)
      : null,
  ]);
  if (up.error) throw new Error(`Events: ${up.error.message}`);
  if (ended?.error) throw new Error(`Events: ${ended.error.message}`);
  const upRows = up.data ?? [];
  const pastRows = ended?.data ?? [];
  const greek = await itemOverlays(
    ctx,
    "event",
    [...upRows, ...pastRows].map((r) => r.id),
  );
  const toCard = (row: (typeof upRows)[number]): EventCard => {
    const { item, lang } = overlayFields(
      { title: row.title, summary: row.summary },
      greek,
      "event",
      row.id,
      ["title", "summary"],
    );
    return {
      id: row.id,
      slug: row.slug,
      ...item,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      timeZone: row.time_zone,
      online: row.online,
      venue: row.venue,
      city: row.city,
      ticketUrl: row.ticket_url,
      coverMediaId: row.cover_media_id,
      textLang: lang,
    };
  };
  const upcoming = upRows.map(toCard);
  const past = pastRows.map(toCard);
  return new Map(sections.map((s) => [s.id, { upcoming, past: s.props.showPast ? past : [] }]));
};

export const press: Loader<"press"> = async (ctx, sections) => {
  const { data, error } = await ctx.db
    .from("press_mentions")
    .select("id, outlet, headline, published_on, url, logo_media_id, position")
    .order("position");
  if (error) throw new Error(`Press: ${error.message}`);
  const items: PressItem[] = (data ?? []).map((row) => ({
    id: row.id,
    outlet: row.outlet,
    headline: row.headline,
    publishedOn: row.published_on,
    url: row.url,
    logoMediaId: row.logo_media_id,
  }));
  return new Map(sections.map((s) => [s.id, { items }]));
};

const STORY_COLUMNS =
  "id, slug, title, summary, person_name, location, category, cover_media_id, anonymise, featured, sort_order, published_at";

export const foundationStories: Loader<"foundation_stories"> = async (ctx, sections) => {
  // Stories store their category by name; an unknown id means all stories.
  const categories = await ctx.db.from("foundation_categories").select("id, name");
  const nameById = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
  const nameOf = (s: (typeof sections)[number]) =>
    s.props.categoryId ? (nameById.get(s.props.categoryId) ?? null) : null;
  // One query per category the sections ask for, filtered in the query.
  const counts = new Map<string | null, number>();
  for (const s of sections)
    counts.set(nameOf(s), Math.max(counts.get(nameOf(s)) ?? 0, s.props.count));
  const results = await Promise.all(
    [...counts].map(async ([name, max]) => {
      let query = ctx.db
        .from("foundation_stories")
        .select(STORY_COLUMNS)
        .eq("consent_recorded", true)
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("id")
        .limit(max);
      if (name) query = query.eq("category", name);
      const { data, error } = await query;
      if (error) throw new Error(`Stories: ${error.message}`);
      return [name, data ?? []] as const;
    }),
  );
  const greek = await itemOverlays(ctx, "foundation_story", [
    ...new Set(results.flatMap(([, rows]) => rows.map((r) => r.id))),
  ]);
  const toCard = (row: (typeof results)[number][1][number]): StoryCard => {
    const { item, lang } = overlayFields(
      { title: row.title, summary: row.summary ?? "" },
      greek,
      "foundation_story",
      row.id,
      ["title", "summary"],
    );
    return {
      id: row.id,
      slug: row.slug,
      ...item,
      personName: row.anonymise ? (row.person_name.split(/\s+/)[0] ?? "") : row.person_name,
      location: row.location ?? "",
      category: row.category,
      coverMediaId: row.anonymise ? null : row.cover_media_id,
      textLang: lang,
    };
  };
  const byName = new Map(results.map(([name, rows]) => [name, rows.map(toCard)]));
  return new Map(
    sections.map((s) => [s.id, { stories: (byName.get(nameOf(s)) ?? []).slice(0, s.props.count) }]),
  );
};

function firstSentence(text: string): string {
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const end = plain.search(/[.!?](\s|$)/);
  return (end > 0 ? plain.slice(0, end + 1) : plain).slice(0, 200);
}
