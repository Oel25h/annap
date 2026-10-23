/**
 * The page builder's reads and writes. Every call runs with the signed-in
 * admin's own token (see studio-auth.server.ts), so row-level security and
 * the audit triggers apply as for any other studio write.
 *
 * - Drafts: the whole sections array in content_drafts ('page', page id).
 * - Greek: content_translations ('page_section', section id). The studio
 *   writes only draft_fields; approving Greek happens elsewhere, by a person.
 * - Publish: validate every section, keep the home page's opening, then the
 *   one publish path, public.publish_draft.
 */
import {
  englishOf,
  sectionName,
  type DraftSection,
  type Fields,
  type GreekRow,
  type StudioPage,
  type StudioPageSummary,
} from "@/components/studio/model";
import type { Locale } from "@/lib/i18n/locale";
import { pageOrderProblem, SECTION_SCHEMAS, type AnySection } from "@/sections/schemas";
import { extractTranslatable, hashFields } from "@/sections/translation";
import type { PageData } from "@/sections/types";
import { overlayKey, type OverlayMap } from "./overlays.server";
import { buildPage, PAGE_COLUMNS, type PageRow } from "./pages.server";
import type { StudioContext } from "./studio-auth.server";
import { publicDb } from "./supabase-public.server";

type Db = StudioContext["supabase"];

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "not found"}`);
}

function toFields(value: unknown): Fields {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Fields = {};
  for (const [key, text] of Object.entries(value)) if (typeof text === "string") out[key] = text;
  return out;
}

function readSections(value: unknown): DraftSection[] {
  return Array.isArray(value) ? (value as DraftSection[]) : [];
}

async function readDraft(db: Db, pageId: string) {
  const { data, error } = await db
    .from("content_drafts")
    .select("data, updated_at")
    .eq("entity_type", "page")
    .eq("entity_id", pageId)
    .maybeSingle();
  if (error) fail("Draft", error);
  const sections = (data?.data as { sections?: unknown } | undefined)?.sections;
  return {
    sections: Array.isArray(sections) ? readSections(sections) : null,
    at: data?.updated_at,
  };
}

async function readGreek(db: Db, ids: string[]): Promise<Record<string, GreekRow>> {
  if (ids.length === 0) return {};
  const { data, error } = await db
    .from("content_translations")
    .select("entity_id, status, fields, draft_fields, source_fields")
    .eq("entity_type", "page_section")
    .eq("locale", "el")
    .in("entity_id", ids);
  if (error) fail("Greek", error);
  const out: Record<string, GreekRow> = {};
  for (const row of data ?? []) {
    out[row.entity_id] = {
      status: row.status === "approved" ? "approved" : "draft",
      fields: toFields(row.fields),
      draftFields: row.draft_fields ? toFields(row.draft_fields) : null,
      sourceFields: row.source_fields ? toFields(row.source_fields) : null,
    };
  }
  return out;
}

export async function listPages(db: Db): Promise<StudioPageSummary[]> {
  const [pages, drafts] = await Promise.all([
    db.from("pages").select("id, path, title, kind, status, locked, sections, updated_at"),
    db.from("content_drafts").select("entity_id").eq("entity_type", "page"),
  ]);
  if (pages.error) fail("Pages", pages.error);
  if (drafts.error) fail("Drafts", drafts.error);
  const drafted = new Set((drafts.data ?? []).map((d) => d.entity_id));
  return (pages.data ?? [])
    .map((p) => ({
      id: p.id,
      path: p.path,
      title: p.title,
      kind: p.kind,
      status: p.status,
      locked: p.locked,
      sectionCount: readSections(p.sections).length,
      hasDraft: drafted.has(p.id),
      updatedAt: p.updated_at,
    }))
    .sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
}

export async function loadStudioPage(db: Db, pageId: string): Promise<StudioPage> {
  const { data: page, error } = await db
    .from("pages")
    .select("id, path, title, kind, status, sections")
    .eq("id", pageId)
    .maybeSingle();
  if (error || !page) fail("Page", error);
  const live = readSections(page.sections);
  const draft = await readDraft(db, pageId);
  const ids = [...new Set([...live, ...(draft.sections ?? [])].map((s) => s.id))];
  const [greek, media, books] = await Promise.all([
    readGreek(db, ids),
    db
      .from("media_assets")
      .select("id, kind, original_name, alt")
      .eq("kind", "image")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("books").select("id, title").order("title"),
  ]);
  return {
    page: { id: page.id, path: page.path, title: page.title, kind: page.kind, status: page.status },
    live,
    draft: draft.sections,
    draftUpdatedAt: draft.at ?? null,
    greek,
    media: (media.data ?? []).map((m) => ({
      id: m.id,
      label: m.alt?.trim() || m.original_name || m.id,
    })),
    books: (books.data ?? []).map((b) => ({ id: b.id, label: b.title })),
  };
}

/** Keep the draft, or drop it when it matches what is live. */
export async function saveDraft(
  db: Db,
  userId: string,
  pageId: string,
  sections: DraftSection[],
): Promise<{ savedAt: string }> {
  const { data: page, error } = await db
    .from("pages")
    .select("sections")
    .eq("id", pageId)
    .maybeSingle();
  if (error || !page) fail("Page", error);
  if (JSON.stringify(page.sections) === JSON.stringify(sections)) {
    const { error: dropError } = await db
      .from("content_drafts")
      .delete()
      .eq("entity_type", "page")
      .eq("entity_id", pageId);
    if (dropError) fail("Draft", dropError);
  } else {
    const { error: saveError } = await db.from("content_drafts").upsert(
      {
        entity_type: "page",
        entity_id: pageId,
        data: { sections } as never,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,entity_id" },
    );
    if (saveError) fail("Draft", saveError);
  }
  return { savedAt: new Date().toISOString() };
}

/** Greek work in progress for one section. Never approves and never touches the live Greek. */
export async function saveGreekDraft(
  db: Db,
  userId: string,
  sectionId: string,
  fields: Fields,
): Promise<{ savedAt: string }> {
  const draft = Object.fromEntries(Object.entries(fields).filter(([, v]) => v.trim()));
  const { data: row, error } = await db
    .from("content_translations")
    .select("id")
    .eq("entity_type", "page_section")
    .eq("entity_id", sectionId)
    .eq("locale", "el")
    .maybeSingle();
  if (error) fail("Greek", error);
  const now = new Date().toISOString();
  const write = row
    ? db
        .from("content_translations")
        .update({ draft_fields: draft, updated_by: userId, updated_at: now })
        .eq("id", row.id)
    : db.from("content_translations").insert({
        entity_type: "page_section",
        entity_id: sectionId,
        locale: "el",
        fields: {},
        draft_fields: draft,
        status: "draft",
        origin: "human",
        updated_by: userId,
      });
  const { error: writeError } = await write;
  if (writeError) fail("Greek", writeError);
  return { savedAt: now };
}

/** "Keep as is": the approved Greek still fits this English, so it is no longer stale. */
export async function keepGreek(
  db: Db,
  userId: string,
  sectionId: string,
  english: Fields,
): Promise<void> {
  const { error } = await db
    .from("content_translations")
    .update({
      source_fields: english,
      source_hash: await hashFields(english),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("entity_type", "page_section")
    .eq("entity_id", sectionId)
    .eq("locale", "el")
    .eq("status", "approved");
  if (error) fail("Greek", error);
}

export type PublishResult = { ok: true } | { ok: false; problems: string[] };

/** Every section valid, the home page's opening in place; then live through publish_draft. */
export async function publishPage(db: Db, pageId: string): Promise<PublishResult> {
  const { data: page, error } = await db
    .from("pages")
    .select("id, kind, sections")
    .eq("id", pageId)
    .maybeSingle();
  if (error || !page) fail("Page", error);
  const live = readSections(page.sections);
  const draft = (await readDraft(db, pageId)).sections ?? live;

  const problems: string[] = [];
  const order = pageOrderProblem(page.kind, draft);
  if (order) problems.push(order);
  const parsed: AnySection[] = [];
  for (const section of draft) {
    const schema = SECTION_SCHEMAS[section.type];
    const result = schema?.safeParse(section);
    if (!result?.success) {
      const issue = result?.error.issues[0];
      const where = issue?.path.filter((p) => p !== "props").join(" ") ?? "";
      problems.push(
        `${sectionName(section)}: ${[where, issue?.message ?? "unknown section"].join(" ").trim()}`,
      );
    } else parsed.push(result.data as AnySection);
  }
  if (problems.length) return { ok: false, problems };

  // Approved Greek that never recorded its English was checked against what is
  // live now; record that before the English changes, so staleness is real.
  const greek = await readGreek(
    db,
    parsed.map((s) => s.id),
  );
  const liveById = new Map(live.map((s) => [s.id, s]));
  for (const [id, row] of Object.entries(greek)) {
    const before = liveById.get(id);
    if (row.status !== "approved" || row.sourceFields || !before) continue;
    const english = englishOf(before);
    const { error: baseError } = await db
      .from("content_translations")
      .update({ source_fields: english, source_hash: await hashFields(english) })
      .eq("entity_type", "page_section")
      .eq("entity_id", id)
      .eq("locale", "el")
      .is("source_hash", null);
    if (baseError) fail("Greek", baseError);
  }

  const { error: saveError } = await db
    .from("content_drafts")
    .upsert(
      { entity_type: "page", entity_id: pageId, data: { sections: parsed } as never },
      { onConflict: "entity_type,entity_id" },
    );
  if (saveError) fail("Draft", saveError);
  const hashes = await Promise.all(
    parsed.map(async (s) => ({
      entity_type: "page_section",
      entity_id: s.id,
      hash: await hashFields(extractTranslatable(s)),
    })),
  );
  const { error: publishError } = await db.rpc("publish_draft", {
    _entity_type: "page",
    _entity_id: pageId,
    _status: "published",
    _english_hashes: hashes,
  });
  if (publishError) fail("Publish", publishError);
  return { ok: true };
}

/** The draft page as it would render, with Greek drafts over the approved Greek. */
export async function previewPage(
  db: Db,
  pageId: string,
  locale: Locale,
): Promise<PageData | null> {
  const { data: row, error } = await db
    .from("pages")
    .select(PAGE_COLUMNS)
    .eq("id", pageId)
    .maybeSingle();
  if (error || !row) return null;
  const draft = await readDraft(db, pageId);
  const sections = draft.sections ?? readSections(row.sections);
  const overlays: OverlayMap = new Map();
  if (locale === "el") {
    const greek = await readGreek(
      db,
      sections.map((s) => s.id),
    );
    for (const [id, g] of Object.entries(greek)) {
      overlays.set(overlayKey("page_section", id), {
        fields: { ...g.fields, ...g.draftFields },
        stale: false,
      });
    }
  }
  return buildPage(publicDb(), { ...(row as PageRow), sections }, locale, {}, overlays);
}
