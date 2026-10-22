/**
 * Pages for collection items: a book, a journal post, a product, a
 * masterclass, an event, a foundation story. Each page is the item's own
 * opening (an ItemIntro) followed by its sections. An item with no sections
 * of its own gets a small default set, written in the page's language: for a
 * book its audiobook, praise for it and the free ebook; for a story, a way
 * to give.
 */
import { getMessages } from "@/lib/i18n/messages";
import { localizePath, type Locale } from "@/lib/i18n/locale";
import { fmt } from "@/lib/i18n/format";
import { readServerPublicConfig } from "@/lib/public-config";
import { SECTION_SCHEMAS, type AnySection, type SectionType } from "@/sections/schemas";
import type { ItemIntro, PageData, PostCard, RenderedSection } from "@/sections/types";
import { loadBooks } from "./loaders/books.server";
import { postCards, postCategories } from "./loaders/collections.server";
import {
  itemOverlays,
  overlayFields,
  publicIntegrations,
  type LoaderContext,
} from "./loaders/common.server";
import { resolveMedia } from "./media.server";
import { parseSections, prepareSections } from "./pages.server";
import { sanitizeRichText } from "./rich-text.server";
import { itemJsonLd, personId } from "./structured-data.server";
import { getSiteSettings } from "./site.server";
import { publicDb } from "./supabase-public.server";

export type ItemKind = "book" | "post" | "product" | "masterclass" | "event" | "story";

/** Where each kind of item lives. */
export const ITEM_BASE: Record<ItemKind, string> = {
  book: "/books",
  post: "/blog",
  product: "/shop",
  masterclass: "/masterclasses",
  event: "/events",
  story: "/foundation/stories",
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Plain text from the studio's lists: one item per line. */
function lines(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

/** The first sentence of some text, for descriptions. */
function summary(text: string | null | undefined, max = 200): string {
  const plain = (text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const end = plain.search(/[.!?](\s|$)/);
  return (end > 0 ? plain.slice(0, end + 1) : plain).slice(0, max);
}

/** Links typed into the studio: a site path or an https address, nothing else. */
function safeHref(value: string | null | undefined): string | null {
  const href = value?.trim() ?? "";
  if (/^\/(?!\/)[^\s]*$/.test(href) || /^https:\/\/[^\s]+$/i.test(href)) return href;
  return null;
}

type Made = { type: SectionType; variant: string; props: Record<string, unknown> };

/**
 * Sections made here rather than in the studio. Their ids derive from the
 * item's, so they stay stable between visits.
 */
function madeSections(itemId: string, list: Made[]): AnySection[] {
  return list.map(
    (made, index) =>
      SECTION_SCHEMAS[made.type].parse({
        id: `${itemId.slice(0, 24)}${(0xd00000000000 + index).toString(16)}`,
        type: made.type,
        variant: made.variant,
        settings: made.type === "audiobook_player" ? { anchor: "listen", background: "cream" } : {},
        props: made.props,
      }) as AnySection,
  );
}

type Shell = {
  kind: ItemKind;
  id: string;
  slug: string;
  locale: Locale;
  title: string;
  /** Whether the title (and so the page) has approved Greek. */
  greek: boolean;
  rawSections: unknown;
  defaults: () => Made[];
  seoTitle: string;
  seoDescription: string;
  imageId: string | null;
  mediaIds: (string | null)[];
  intro: ItemIntro;
  jsonLd?: (url: string, image: string | null) => Record<string, unknown>;
};

/** Sections, media, SEO and the Greek rules, the same for every kind of item. */
async function finish(ctx: LoaderContext, shell: Shell): Promise<PageData> {
  const path = `${ITEM_BASE[shell.kind]}/${shell.slug}`;
  const own = parseSections(shell.rawSections, path);
  const made = own.length === 0 ? madeSections(shell.id, shell.defaults()) : [];
  const madeIds = new Set(made.map((s) => s.id));
  const [{ sections: prepared, mediaIds }, site] = await Promise.all([
    prepareSections(ctx.db, own.length ? own : made, ctx.locale),
    getSiteSettings(ctx.db),
  ]);
  // Made sections are written in the page's language already.
  const sections = prepared.map((s) =>
    madeIds.has(s.id) ? ({ ...s, lang: ctx.locale, englishKeys: [] } as RenderedSection) : s,
  );

  for (const id of shell.mediaIds) if (id) mediaIds.add(id);
  const imageId = shell.imageId ?? site.socialImageId;
  if (imageId) mediaIds.add(imageId);
  const media = await resolveMedia(ctx.db, mediaIds, ctx.locale);

  const { siteUrl } = readServerPublicConfig();
  const englishUrl = `${siteUrl}${localizePath(path, "en")}`;
  const greekUrl = `${siteUrl}${localizePath(path, "el")}`;
  const canonical = ctx.locale === "el" && shell.greek ? greekUrl : englishUrl;
  const image = imageId ? (media[imageId] ?? null) : null;
  const titleLang: Locale = ctx.locale === "el" && !shell.greek ? "en" : ctx.locale;

  return {
    id: shell.id,
    path,
    kind: shell.kind,
    locale: ctx.locale,
    title: shell.title,
    titleLang,
    hasEnglishParts:
      ctx.locale === "el" &&
      (!shell.greek || sections.some((s) => s.lang === "en" || s.englishKeys.length > 0)),
    sections,
    media,
    seo: {
      title: shell.seoTitle || shell.title,
      description:
        shell.seoDescription ||
        (ctx.locale === "el" ? site.greek.defaultSeoDescription : "") ||
        site.defaultSeoDescription,
      noindex: false,
      canonical,
      alternates: shell.greek ? { en: englishUrl, el: greekUrl } : null,
      image,
    },
    intro: shell.intro,
    jsonLd: shell.jsonLd
      ? await itemJsonLd(ctx.db, shell.jsonLd(canonical, image ? image.src : null), {
          locale: ctx.locale,
          parent: shell.kind === "story" ? "/foundation" : ITEM_BASE[shell.kind],
          path,
          name: shell.title,
        })
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

async function bookPage(ctx: LoaderContext, slug: string): Promise<PageData | null> {
  const { data: row } = await ctx.db
    .from("books")
    .select("id, slug, who_for, sections, seo_title, seo_description")
    .eq("slug", slug)
    .maybeSingle();
  if (!row) return null;
  const [book] = await loadBooks(ctx, [row.id]);
  if (!book) return null;
  const t = getMessages(ctx.locale).items;
  const overlays = await itemOverlays(ctx, "book", [row.id]);
  const extra = overlayFields(
    {
      whoFor: row.who_for ?? "",
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
    },
    overlays,
    "book",
    row.id,
    ["whoFor", "seoTitle", "seoDescription"],
  ).item;
  const { data: audiobooks } = await ctx.db
    .from("audiobooks")
    .select("id")
    .eq("book_id", row.id)
    .order("position");
  const ebook = getMessages(ctx.locale).sections.ebook;

  return finish(ctx, {
    kind: "book",
    id: row.id,
    slug: row.slug,
    locale: ctx.locale,
    title: book.title,
    greek: book.textLang === "el",
    rawSections: row.sections,
    defaults: () => [
      ...(audiobooks?.length
        ? [
            {
              type: "audiobook_player" as const,
              variant: "single",
              props: { title: t.book.listen, audiobookIds: audiobooks.map((a) => a.id) },
            },
          ]
        : []),
      {
        type: "testimonials",
        variant: "carousel",
        props: { title: t.book.praise, bookId: row.id },
      },
      ...(book.freeDownload
        ? [
            {
              type: "ebook_gate" as const,
              variant: "card",
              props: {
                bookId: row.id,
                title: ebook.title,
                body: fmt(ebook.body, { title: book.title }),
              },
            },
          ]
        : []),
    ],
    seoTitle: extra.seoTitle,
    seoDescription: extra.seoDescription || book.tagline || summary(book.description),
    imageId: book.coverMediaId,
    mediaIds: [book.coverMediaId],
    intro: { kind: "book", book, whoFor: extra.whoFor },
    jsonLd: (url, image) => ({
      "@context": "https://schema.org",
      "@type": "Book",
      name: book.title,
      ...(book.subtitle ? { alternativeHeadline: book.subtitle } : {}),
      author: { "@type": "Person", "@id": personId(), name: "Anastasia Patience" },
      description: summary(book.description, 500),
      url,
      ...(image ? { image } : {}),
      inLanguage: book.textLang,
    }),
  });
}

// ---------------------------------------------------------------------------
// Journal posts
// ---------------------------------------------------------------------------

async function postPage(ctx: LoaderContext, slug: string): Promise<PageData | null> {
  const { data: row } = await ctx.db
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, body, published_at, publish_date, updated_at, reading_minutes, cover_media_id, category_id, seo_title, seo_description, category:blog_categories(id, slug, name)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!row) return null;
  const categories = await postCategories(ctx);
  const [card] = await postCards(ctx, [row], categories);
  const overlays = await itemOverlays(ctx, "blog_post", [row.id]);
  const { item: text } = overlayFields(
    {
      body: row.body ?? "",
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
    },
    overlays,
    "blog_post",
    row.id,
    ["body", "seoTitle", "seoDescription"],
  );
  // Greek body only together with a Greek title, so a page never mixes them.
  const greek = card.textLang === "el";
  const bodyHtml = sanitizeRichText(greek ? text.body : (row.body ?? ""));

  // Keep reading: the newest in the same category, then the newest overall.
  const { data: nearby } = await ctx.db
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, published_at, publish_date, reading_minutes, cover_media_id, category_id, category:blog_categories(id, slug, name)",
    )
    .neq("id", row.id)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(12);
  const cards = await postCards(ctx, nearby ?? [], categories);
  const preferred = ctx.locale === "el" ? cards.filter((c) => c.textLang === "el") : cards;
  const pool = preferred.length >= 3 ? preferred : cards;
  const related: PostCard[] = [
    ...pool.filter((c) => row.category_id && c.categoryId === row.category_id),
    ...pool.filter((c) => !row.category_id || c.categoryId !== row.category_id),
  ]
    .slice(0, 3)
    .map(({ categoryId: _drop, ...rest }) => rest);
  const { categoryId: _id, ...post } = card;

  return finish(ctx, {
    kind: "post",
    id: row.id,
    slug: row.slug,
    locale: ctx.locale,
    title: post.title,
    greek,
    rawSections: [],
    defaults: () => [],
    seoTitle: greek ? text.seoTitle : (row.seo_title ?? ""),
    seoDescription:
      (greek ? text.seoDescription : (row.seo_description ?? "")) ||
      post.excerpt ||
      summary(bodyHtml),
    imageId: post.coverMediaId,
    mediaIds: [post.coverMediaId, ...related.map((r) => r.coverMediaId)],
    intro: { kind: "post", post, bodyHtml, related },
    jsonLd: (url, image) => ({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      ...(post.excerpt ? { description: post.excerpt } : {}),
      author: { "@type": "Person", "@id": personId(), name: "Anastasia Patience" },
      ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
      ...(row.updated_at ? { dateModified: row.updated_at } : {}),
      mainEntityOfPage: url,
      ...(image ? { image } : {}),
      inLanguage: post.textLang,
    }),
  });
}

// ---------------------------------------------------------------------------
// Shop products
// ---------------------------------------------------------------------------

async function productPage(ctx: LoaderContext, slug: string): Promise<PageData | null> {
  const { data: row } = await ctx.db
    .from("products")
    .select(
      "id, slug, name, description, who_for, included, product_type, price_cents, compare_at_cents, price, currency, stock_note, checkout_url, cover_media_id, sections, seo_title, seo_description",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!row) return null;
  const [overlays, integrations] = await Promise.all([
    itemOverlays(ctx, "product", [row.id]),
    publicIntegrations(ctx),
  ]);
  const { item: text, lang } = overlayFields(
    {
      name: row.name,
      description: row.description ?? "",
      whoFor: row.who_for ?? "",
      included: row.included ?? "",
      stockNote: row.stock_note ?? "",
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
    },
    overlays,
    "product",
    row.id,
    ["name", "description", "whoFor", "included", "stockNote", "seoTitle", "seoDescription"],
  );
  const currency = row.currency || "EUR";
  const buyHere = integrations.payments && row.price_cents !== null && row.price_cents > 0;
  const product = {
    id: row.id,
    slug: row.slug,
    name: text.name,
    summary: text.whoFor || summary(text.description),
    productType: row.product_type,
    priceCents: row.price_cents,
    currency,
    priceLabel: row.price ?? "",
    coverMediaId: row.cover_media_id,
    textLang: lang,
  };

  return finish(ctx, {
    kind: "product",
    id: row.id,
    slug: row.slug,
    locale: ctx.locale,
    title: text.name,
    greek: lang === "el",
    rawSections: row.sections,
    defaults: () => [],
    seoTitle: text.seoTitle,
    seoDescription: text.seoDescription || product.summary,
    imageId: row.cover_media_id,
    mediaIds: [row.cover_media_id],
    intro: {
      kind: "product",
      product,
      description: text.description,
      whoFor: text.whoFor,
      included: lines(text.included),
      compareAtCents: row.compare_at_cents,
      stockNote: text.stockNote,
      buyHere,
      externalUrl: buyHere ? null : safeHref(row.checkout_url),
    },
    jsonLd: (url, image) => ({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: summary(text.description, 500),
      ...(image ? { image } : {}),
      brand: { "@type": "Brand", name: "Patience Media House" },
      ...(row.price_cents !== null
        ? {
            offers: {
              "@type": "Offer",
              price: (row.price_cents / 100).toFixed(2),
              priceCurrency: currency,
              availability: "https://schema.org/InStock",
              url,
            },
          }
        : {}),
    }),
  });
}

// ---------------------------------------------------------------------------
// Masterclasses
// ---------------------------------------------------------------------------

async function masterclassPage(ctx: LoaderContext, slug: string): Promise<PageData | null> {
  const { data: row } = await ctx.db
    .from("masterclasses")
    .select(
      "id, slug, title, summary, description, included, starts_at, ends_at, schedule_note, format, location, price_label, enrol_url, enrol_product_id, availability, cover_media_id, sections, seo_title, seo_description",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!row) return null;
  const [overlays, integrations] = await Promise.all([
    itemOverlays(ctx, "masterclass", [row.id]),
    publicIntegrations(ctx),
  ]);
  const { item: text, lang } = overlayFields(
    {
      title: row.title,
      summary: row.summary,
      description: row.description ?? "",
      included: row.included ?? "",
      scheduleNote: row.schedule_note,
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
    },
    overlays,
    "masterclass",
    row.id,
    ["title", "summary", "description", "included", "scheduleNote", "seoTitle", "seoDescription"],
  );
  const masterclass = {
    id: row.id,
    slug: row.slug,
    title: text.title,
    summary: text.summary,
    startsAt: row.starts_at,
    scheduleNote: text.scheduleNote,
    format: (["online", "in_person", "hybrid"] as const).find((f) => f === row.format) ?? "online",
    location: row.location,
    priceLabel: row.price_label,
    availability:
      (["open", "waitlist", "closed"] as const).find((a) => a === row.availability) ?? "open",
    coverMediaId: row.cover_media_id,
    textLang: lang,
  };

  return finish(ctx, {
    kind: "masterclass",
    id: row.id,
    slug: row.slug,
    locale: ctx.locale,
    title: text.title,
    greek: lang === "el",
    rawSections: row.sections,
    defaults: () => [],
    seoTitle: text.seoTitle,
    seoDescription: text.seoDescription || text.summary,
    imageId: row.cover_media_id,
    mediaIds: [row.cover_media_id],
    intro: {
      kind: "masterclass",
      masterclass,
      endsAt: row.ends_at,
      description: text.description,
      included: lines(text.included),
      enrolUrl: safeHref(row.enrol_url),
      enrolProductId: integrations.payments ? row.enrol_product_id : null,
      payments: integrations.payments,
    },
  });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

async function eventPage(ctx: LoaderContext, slug: string): Promise<PageData | null> {
  const { data: row } = await ctx.db
    .from("events")
    .select(
      "id, slug, title, summary, starts_at, ends_at, time_zone, online, venue, city, ticket_url, cover_media_id, sections, seo_title, seo_description",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!row) return null;
  const overlays = await itemOverlays(ctx, "event", [row.id]);
  const { item: text, lang } = overlayFields(
    {
      title: row.title,
      summary: row.summary,
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
    },
    overlays,
    "event",
    row.id,
    ["title", "summary", "seoTitle", "seoDescription"],
  );
  const event = {
    id: row.id,
    slug: row.slug,
    title: text.title,
    summary: text.summary,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timeZone: row.time_zone,
    online: row.online,
    venue: row.venue,
    city: row.city,
    ticketUrl: safeHref(row.ticket_url),
    coverMediaId: row.cover_media_id,
    textLang: lang,
  };

  return finish(ctx, {
    kind: "event",
    id: row.id,
    slug: row.slug,
    locale: ctx.locale,
    title: text.title,
    greek: lang === "el",
    rawSections: row.sections,
    defaults: () => [],
    seoTitle: text.seoTitle,
    seoDescription: text.seoDescription || summary(text.summary),
    imageId: row.cover_media_id,
    mediaIds: [row.cover_media_id],
    intro: { kind: "event", event },
    jsonLd: (url, image) => ({
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.title,
      description: summary(event.summary, 500),
      startDate: event.startsAt,
      ...(event.endsAt ? { endDate: event.endsAt } : {}),
      eventAttendanceMode: event.online
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
      location: event.online
        ? { "@type": "VirtualLocation", url: event.ticketUrl ?? url }
        : {
            "@type": "Place",
            name: event.venue || event.city,
            address: { "@type": "PostalAddress", addressLocality: event.city },
          },
      organizer: { "@type": "Person", "@id": personId(), name: "Anastasia Patience" },
      ...(image ? { image } : {}),
      ...(event.ticketUrl ? { offers: { "@type": "Offer", url: event.ticketUrl } } : {}),
      url,
    }),
  });
}

// ---------------------------------------------------------------------------
// Foundation stories
// ---------------------------------------------------------------------------

async function storyPage(ctx: LoaderContext, slug: string): Promise<PageData | null> {
  const { data: row } = await ctx.db
    .from("foundation_stories")
    .select(
      "id, slug, title, summary, body, person_name, location, category, cover_media_id, anonymise, sections, seo_title, seo_description",
    )
    .eq("slug", slug)
    .eq("consent_recorded", true)
    .maybeSingle();
  if (!row) return null;
  const overlays = await itemOverlays(ctx, "foundation_story", [row.id]);
  const { item: text, lang } = overlayFields(
    {
      title: row.title,
      summary: row.summary ?? "",
      body: row.body ?? "",
      seoTitle: row.seo_title ?? "",
      seoDescription: row.seo_description ?? "",
    },
    overlays,
    "foundation_story",
    row.id,
    ["title", "summary", "body", "seoTitle", "seoDescription"],
  );
  const greek = lang === "el";
  const story = {
    id: row.id,
    slug: row.slug,
    title: text.title,
    summary: text.summary,
    // An anonymised story shows a first name only, and no photograph.
    personName: row.anonymise ? (row.person_name.split(/\s+/)[0] ?? "") : row.person_name,
    location: row.location ?? "",
    category: row.category,
    coverMediaId: row.anonymise ? null : row.cover_media_id,
    textLang: lang,
  };
  const t = getMessages(ctx.locale).items.story;

  return finish(ctx, {
    kind: "story",
    id: row.id,
    slug: row.slug,
    locale: ctx.locale,
    title: text.title,
    greek,
    rawSections: row.sections,
    defaults: () => [
      { type: "donation", variant: "band", props: { title: t.giveTitle, body: t.giveBody } },
    ],
    seoTitle: text.seoTitle,
    seoDescription: text.seoDescription || text.summary || summary(text.body),
    imageId: story.coverMediaId,
    mediaIds: [story.coverMediaId],
    intro: {
      kind: "story",
      story,
      bodyHtml: sanitizeRichText(greek ? text.body : (row.body ?? "")),
    },
  });
}

const LOADERS: Record<ItemKind, (ctx: LoaderContext, slug: string) => Promise<PageData | null>> = {
  book: bookPage,
  post: postPage,
  product: productPage,
  masterclass: masterclassPage,
  event: eventPage,
  story: storyPage,
};

/** One published item's page in one language, or null. */
export async function loadItemPage(
  kind: ItemKind,
  slug: string,
  locale: Locale,
): Promise<PageData | null> {
  if (!SLUG.test(slug) || slug.length > 120) return null;
  return LOADERS[kind]({ db: publicDb(), locale }, slug);
}
