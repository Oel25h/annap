/**
 * Loads a published CMS page for one language, ready to render: sections
 * validated, hidden ones dropped, approved Greek applied, rich text
 * sanitised, media resolved and the SEO rules worked out.
 */
import { localizePath, type Locale } from "@/lib/i18n/locale";
import { readServerPublicConfig } from "@/lib/public-config";
import {
  isSectionType,
  SECTION_SCHEMAS,
  TRANSLATABLE,
  type AnySection,
  type SectionType,
} from "@/sections/schemas";
import { applyOverlay, extractTranslatable } from "@/sections/translation";
import type { PageData, PageQuery, RenderedSection } from "@/sections/types";
import { collectMediaIds, resolveMedia } from "./media.server";
import { fetchOverlays, overlayKey, type OverlayMap, type OverlayRequest } from "./overlays.server";
import { sanitizeRichText } from "./rich-text.server";
import { loadSectionData } from "./section-data.server";
import { getSiteSettings } from "./site.server";
import { publicDb, type PublicDb } from "./supabase-public.server";

const PAGE_PATH = /^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/;

/** `/About/` → `/about`. Returns null for anything that cannot be a page path. */
export function normalizePagePath(path: string): string | null {
  const trimmed = path.trim().toLowerCase().replace(/\/+$/, "") || "/";
  return PAGE_PATH.test(trimmed) ? trimmed : null;
}

/** Valid, visible sections. Invalid ones are skipped and logged, never shown half-broken. */
export function parseSections(raw: unknown, pagePath: string): AnySection[] {
  if (!Array.isArray(raw)) return [];
  const sections: AnySection[] = [];
  for (const item of raw) {
    const type = (item as { type?: unknown } | null)?.type;
    if (!isSectionType(type)) {
      console.warn(`[pages] ${pagePath}: unknown section type ${String(type)}`);
      continue;
    }
    const parsed = SECTION_SCHEMAS[type].safeParse(item);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      console.warn(
        `[pages] ${pagePath}: skipped ${type} section: ${issue?.path.join(".")} ${issue?.message}`,
      );
      continue;
    }
    if (!parsed.data.settings.hidden) sections.push(parsed.data as AnySection);
  }
  return sections;
}

/** Sanitise every rich-text prop of a section, whatever language it is in. */
function sanitizeSection<S extends AnySection>(section: S): S {
  const spec = TRANSLATABLE[section.type as SectionType];
  const props = { ...(section.props as Record<string, unknown>) };
  let changed = false;
  for (const [field, kind] of Object.entries(spec)) {
    if (kind !== "rich" || field.includes(".")) continue;
    const value = props[field];
    if (typeof value === "string") {
      props[field] = sanitizeRichText(value);
      changed = true;
    }
  }
  return changed ? ({ ...section, props } as S) : section;
}

function localizeSection(
  section: AnySection,
  locale: Locale,
  overlays: OverlayMap,
): Omit<RenderedSection, "data"> {
  if (locale === "en") return { ...section, lang: "en", englishKeys: [] } as never;
  const overlay = overlays.get(overlayKey("page_section", section.id));
  const english = extractTranslatable(section);
  if (Object.keys(english).length === 0) {
    // Nothing to translate (an image, a book list): it belongs to the page's language.
    return { ...section, lang: "el", englishKeys: [] } as never;
  }
  if (!overlay) return { ...section, lang: "en", englishKeys: [] } as never;
  const { section: greek } = applyOverlay(section, overlay.fields);
  const englishKeys = Object.keys(english).filter((key) => !overlay.fields[key]?.trim());
  return { ...greek, lang: "el", englishKeys } as never;
}

/**
 * Sections ready to render: approved Greek applied, rich text sanitised and
 * each section's data loaded. `extra` asks for more Greek in the same query.
 */
export async function prepareSections(
  db: PublicDb,
  parsed: AnySection[],
  locale: Locale,
  options: { extra?: OverlayRequest; query?: PageQuery } = {},
): Promise<{ sections: RenderedSection[]; overlays: OverlayMap; mediaIds: Set<string> }> {
  const [overlays, sectionData] = await Promise.all([
    locale === "el"
      ? fetchOverlays(db, { page_section: parsed.map((s) => s.id), ...options.extra })
      : Promise.resolve<OverlayMap>(new Map()),
    loadSectionData(db, parsed, locale, options.query),
  ]);
  const sections = parsed.map((section) => {
    const localized = localizeSection(section, locale, overlays);
    return {
      ...sanitizeSection(localized as unknown as AnySection),
      lang: localized.lang,
      englishKeys: localized.englishKeys,
      data: sectionData.get(section.id) ?? null,
    } as RenderedSection;
  });
  const mediaIds = collectMediaIds(sections.map((s) => s.props));
  for (const data of sectionData.values()) collectMediaIds(data, mediaIds);
  return { sections, overlays, mediaIds };
}

/** Whether a Greek page counts as translated: some of its section text is approved Greek. */
export function sectionsInGreek(sections: RenderedSection[]): boolean {
  return sections.some(
    (s) => s.lang === "el" && Object.keys(extractTranslatable(s as AnySection)).length > 0,
  );
}

/**
 * Whether the journal page and category asked for exist. A page past the
 * last, or a category that is not there, is a 404 rather than a copy of
 * the first page.
 */
function queryExists(sections: RenderedSection[], query: PageQuery): boolean {
  if (!query.page && !query.category) return true;
  for (const section of sections) {
    if (section.type !== "latest_posts") continue;
    const pagination = (section as RenderedSection<"latest_posts">).data?.pagination;
    if (!pagination) continue;
    if ((query.page ?? 1) > pagination.pages) return false;
    if (query.category && pagination.category !== query.category) return false;
    return true;
  }
  // No journal index on this page: the query means nothing here, so it is ignored.
  return true;
}

export async function loadPage(
  rawPath: string,
  locale: Locale,
  query: PageQuery = {},
): Promise<PageData | null> {
  const path = normalizePagePath(rawPath);
  if (!path) return null;
  const db = publicDb();

  const { data: row, error } = await db
    .from("pages")
    .select("id, path, kind, title, seo_title, seo_description, noindex, og_image_id, sections")
    .eq("path", path)
    .maybeSingle();
  if (error) throw new Error(`Page ${path}: ${error.message}`);
  if (!row) return null;

  const parsed = parseSections(row.sections, path);
  const [{ sections, overlays, mediaIds }, site] = await Promise.all([
    prepareSections(db, parsed, locale, { extra: { page_meta: [row.id] }, query }),
    getSiteSettings(db),
  ]);
  if (!queryExists(sections, query)) return null;

  const ogImageId = row.og_image_id ?? site.socialImageId;
  if (ogImageId) mediaIds.add(ogImageId);
  const media = await resolveMedia(db, mediaIds, locale);

  // Greek title and SEO text, when a person approved them.
  const meta = locale === "el" ? overlays.get(overlayKey("page_meta", row.id))?.fields : undefined;
  const greekTitle = meta?.title?.trim() || "";
  const title = greekTitle || row.title;
  const titleLang: Locale = greekTitle ? "el" : "en";

  // A Greek URL counts as translated once its title and some of its text are approved.
  const hasTranslatableText = parsed.some((s) => Object.keys(extractTranslatable(s)).length > 0);
  const greekReady = !!greekTitle && (sectionsInGreek(sections) || !hasTranslatableText);

  const { siteUrl } = readServerPublicConfig();
  // The journal index's pages and categories are pages of their own.
  const paginated = parsed.some((s) => s.type === "latest_posts" && s.props.paginate);
  const search = new URLSearchParams();
  if (paginated && query.category) search.set("category", query.category);
  if (paginated && query.page && query.page > 1) search.set("page", String(query.page));
  const qs = search.size ? `?${search}` : "";
  const englishUrl = `${siteUrl}${localizePath(path, "en")}${qs}`;
  const greekUrl = `${siteUrl}${localizePath(path, "el")}${qs}`;
  const canonical = locale === "el" && greekReady ? greekUrl : englishUrl;

  const seoTitle = (titleLang === "el" ? meta?.seo_title?.trim() : row.seo_title.trim()) || title;
  const seoDescription =
    [
      locale === "el" ? meta?.seo_description : "",
      locale === "el" ? site.greek.defaultSeoDescription : "",
      row.seo_description,
      site.defaultSeoDescription,
    ]
      .map((text) => text?.trim() ?? "")
      .find(Boolean) ?? "";

  return {
    id: row.id,
    path,
    kind: row.kind,
    locale,
    title,
    titleLang,
    hasEnglishParts:
      locale === "el" &&
      (titleLang === "en" || sections.some((s) => s.lang === "en" || s.englishKeys.length > 0)),
    sections,
    media,
    seo: {
      title: seoTitle,
      description: seoDescription,
      noindex: row.noindex,
      canonical,
      alternates: greekReady ? { en: englishUrl, el: greekUrl } : null,
      image: ogImageId ? (media[ogImageId] ?? null) : null,
    },
  };
}
