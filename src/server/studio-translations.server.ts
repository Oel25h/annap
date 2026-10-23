/**
 * The Greek translations queue: every piece of English the site shows in
 * Greek, with its Greek status, and the two writes a person makes.
 *
 * - Statuses follow DESIGN.md §11: Missing → Draft → Approved, and Stale once
 *   the English changes after approval (the English recorded at approval,
 *   source_fields, or its hash, no longer matches the English now).
 * - Saving writes draft_fields only. The live Greek (fields) changes only when
 *   a person presses Approve, which records who approved it (approved_by), and
 *   the English it was checked against (source_fields and its hash).
 * - Nothing here generates Greek: no machine translation, no auto-approval.
 *
 * Every call runs with the signed-in admin's own token (row-level security).
 */
import { englishOf, sectionName, type DraftSection } from "@/components/studio/model";
import { TRANSLATABLE, type SectionType } from "@/sections/schemas";
import { hashFields } from "@/sections/translation";
import type { StudioContext } from "./studio-auth.server";

type Db = StudioContext["supabase"];
type Fields = Record<string, string>;
type Row = Record<string, unknown>;

export type QueueStatus = "missing" | "draft" | "stale" | "approved";

export type QueueField = {
  key: string;
  label: string;
  rich: boolean;
  /** The English now. */
  english: string;
  /** The English the approved Greek was checked against, when it differs from now. */
  was: string | null;
  /** The approved Greek that is live. */
  greek: string;
  /** Work in progress, or the live Greek when there is none. */
  draft: string;
};

export type QueueItem = {
  entityType: string;
  entityId: string;
  group: string;
  title: string;
  /** Where the English is edited in the studio. */
  editHref: string | null;
  status: QueueStatus;
  /** Stale, but the English it was approved against was never recorded. */
  changedUnknown: boolean;
  approvedAt: string | null;
  fields: QueueField[];
};

type FieldSpec = { key: string; column: string; label: string; rich?: boolean };
type ItemSpec = {
  group: string;
  table: string;
  title: string;
  fields: FieldSpec[];
  editHref: (id: string) => string;
  /** Only rows that readers can see. */
  filter?: (row: Row) => boolean;
};

const f = (key: string, label: string, column = key, rich = false): FieldSpec => ({
  key,
  column,
  label,
  rich,
});
const SEO = [
  f("seoTitle", "Search title", "seo_title"),
  f("seoDescription", "Search description", "seo_description"),
];

/** The content types with Greek, each with the keys its loader reads (src/server/loaders). */
export const ITEM_SPECS: Record<string, ItemSpec> = {
  book: {
    group: "Books",
    table: "books",
    title: "title",
    fields: [
      f("title", "Title"),
      f("subtitle", "Subtitle"),
      f("tagline", "Tagline"),
      f("description", "Description"),
      f("whoFor", "Who it's for", "who_for"),
      ...SEO,
    ],
    editHref: (id) => `/admin/books?item=${id}`,
  },
  blog_post: {
    group: "Stories",
    table: "blog_posts",
    title: "title",
    fields: [
      f("title", "Title"),
      f("excerpt", "Excerpt"),
      f("body", "Story", "body", true),
      ...SEO,
    ],
    editHref: (id) => `/admin/blog?item=${id}`,
  },
  blog_category: {
    group: "Story categories",
    table: "blog_categories",
    title: "name",
    fields: [f("name", "Name")],
    editHref: () => `/admin/blog`,
  },
  product: {
    group: "Shop",
    table: "products",
    title: "name",
    fields: [
      f("name", "Name"),
      f("description", "Description"),
      f("whoFor", "Who it's for", "who_for"),
      f("included", "What's included"),
      f("stockNote", "Stock note", "stock_note"),
      ...SEO,
    ],
    editHref: (id) => `/admin/products?item=${id}`,
  },
  masterclass: {
    group: "Masterclasses",
    table: "masterclasses",
    title: "title",
    fields: [
      f("title", "Title"),
      f("summary", "Summary"),
      f("description", "Description"),
      f("included", "What's included"),
      f("scheduleNote", "Schedule note", "schedule_note"),
      ...SEO,
    ],
    editHref: (id) => `/admin/masterclass?item=${id}`,
  },
  event: {
    group: "Events",
    table: "events",
    title: "title",
    fields: [f("title", "Title"), f("summary", "Summary"), ...SEO],
    editHref: (id) => `/admin/events?item=${id}`,
  },
  foundation_story: {
    group: "Foundation stories",
    table: "foundation_stories",
    title: "title",
    fields: [
      f("title", "Title"),
      f("summary", "Summary"),
      f("body", "Story", "body", true),
      ...SEO,
    ],
    editHref: (id) => `/admin/foundation?item=${id}`,
  },
  testimonial: {
    group: "Praise",
    table: "testimonials",
    title: "name",
    fields: [f("quote", "Quote"), f("name", "Name"), f("role", "Role")],
    editHref: (id) => `/admin/testimonials?item=${id}`,
  },
  video: {
    group: "Videos",
    table: "videos",
    title: "title",
    fields: [f("title", "Title"), f("description", "Description")],
    editHref: () => `/admin/settings`,
    filter: (row) => row.hidden !== true,
  },
  media_asset: {
    group: "Media",
    table: "media_assets",
    title: "original_name",
    fields: [f("alt", "Alt text"), f("caption", "Caption")],
    editHref: (id) => `/admin/media?item=${id}`,
    filter: (row) => row.kind === "image" && row.status === "ready",
  },
  navigation_item: {
    group: "Menus",
    table: "navigation_items",
    title: "label",
    fields: [f("label", "Label")],
    editHref: () => `/admin/pages`,
    filter: (row) => row.enabled !== false,
  },
  page_meta: {
    group: "Page titles",
    table: "pages",
    title: "title",
    fields: [
      f("title", "Title"),
      f("seo_title", "Search title"),
      f("seo_description", "Search description"),
    ],
    editHref: (id) => `/admin/pages/${id}`,
  },
  site_settings: {
    group: "Site",
    table: "site_settings",
    title: "site_name",
    fields: [
      f("tagline", "Tagline"),
      f("default_seo_description", "Search description"),
      f("footer_text", "Footer text"),
    ],
    editHref: () => `/admin/settings`,
  },
};

const ENTITY_TYPES = ["page_section", ...Object.keys(ITEM_SPECS)];

export function isQueueEntity(entityType: string): boolean {
  return ENTITY_TYPES.includes(entityType);
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "not found"}`);
}

function toFields(value: unknown): Fields {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Fields = {};
  for (const [key, text] of Object.entries(value)) if (typeof text === "string") out[key] = text;
  return out;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** "items.<uuid>.title" → "Item 2 · Title"; "primary.label" → "Primary · Label". */
function sectionFieldLabel(type: SectionType, key: string, section: DraftSection): string {
  const human = (s: string) => {
    const words = s
      .replace(/([A-Z])/g, " $1")
      .replace(/[_.]/g, " ")
      .trim()
      .toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
  };
  const item = key.match(/^(\w+)\.([0-9a-f-]{36})\.(.+)$/);
  if (item) {
    const list = section.props[item[1]];
    const index = Array.isArray(list)
      ? list.findIndex((i) => (i as { id?: string })?.id === item[2])
      : -1;
    return `${human(item[1]).replace(/s$/, "")} ${index + 1} · ${human(item[3])}`;
  }
  if (key === "title") return "Heading";
  return human(key);
}

type Translation = {
  status: string;
  fields: Fields;
  draft: Fields | null;
  source: Fields | null;
  sourceHash: string | null;
  approvedAt: string | null;
};

async function readTranslations(db: Db, entityType?: string) {
  let query = db
    .from("content_translations")
    .select(
      "entity_type, entity_id, status, fields, draft_fields, source_fields, source_hash, approved_at",
    )
    .eq("locale", "el");
  if (entityType) query = query.eq("entity_type", entityType);
  const { data, error } = await query;
  if (error) fail("Greek", error);
  const map = new Map<string, Translation>();
  for (const row of data ?? []) {
    map.set(`${row.entity_type}:${row.entity_id}`, {
      status: row.status,
      fields: toFields(row.fields),
      draft: row.draft_fields ? toFields(row.draft_fields) : null,
      source: row.source_fields ? toFields(row.source_fields) : null,
      sourceHash: row.source_hash,
      approvedAt: row.approved_at,
    });
  }
  return map;
}

function same(a: Fields, b: Fields): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

async function build(
  base: Omit<QueueItem, "status" | "changedUnknown" | "approvedAt" | "fields">,
  specs: { key: string; label: string; rich: boolean }[],
  english: Fields,
  t: Translation | undefined,
): Promise<QueueItem | null> {
  if (Object.keys(english).length === 0) return null;
  const draft = { ...(t?.fields ?? {}), ...(t?.draft ?? {}) };
  const hasGreek = Object.values(draft).some((v) => v.trim());
  let status: QueueStatus;
  let changedUnknown = false;
  if (!t || !hasGreek) status = "missing";
  else if (t.status !== "approved") status = "draft";
  else if (t.source ? !same(t.source, english) : !!t.sourceHash) {
    const stale = t.source ? true : (await hashFields(english)) !== t.sourceHash;
    changedUnknown = stale && !t.source;
    status = stale ? "stale" : "approved";
  } else status = "approved";
  if (status === "approved" && t?.draft && !same({ ...t.fields, ...t.draft }, t.fields))
    status = "draft";

  return {
    ...base,
    status,
    changedUnknown,
    approvedAt: t?.approvedAt ?? null,
    fields: specs
      .filter((s) => english[s.key])
      .map((s) => {
        const was = t?.source?.[s.key] ?? null;
        return {
          ...s,
          english: english[s.key],
          was: status === "stale" && was !== null && was !== english[s.key] ? was : null,
          greek: t?.status === "approved" ? (t.fields[s.key] ?? "") : "",
          draft: draft[s.key] ?? "",
        };
      }),
  };
}

/** The English of every item of one content type, keyed by id. */
async function itemEnglish(db: Db, entityType: string, id?: string) {
  const spec = ITEM_SPECS[entityType];
  const columns = [
    "id",
    spec.title,
    ...spec.fields.map((s) => s.column),
    ...(entityType === "video" ? ["hidden"] : []),
    ...(entityType === "media_asset" ? ["kind", "status"] : []),
    ...(entityType === "navigation_item" ? ["enabled"] : []),
  ];
  let query = db.from(spec.table as "books").select([...new Set(columns)].join(", "));
  if (id) query = query.eq("id", id);
  const { data, error } = await query;
  if (error) fail(spec.group, error);
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => !spec.filter || spec.filter(r));
  return rows.map((row) => {
    const english: Fields = {};
    for (const s of spec.fields) {
      const value = text(row[s.column]);
      if (value.trim()) english[s.key] = value;
    }
    return { id: String(row.id), title: text(row[spec.title]) || spec.group, english };
  });
}

/** Every live section with words in it, with the English the site shows now. */
async function sectionEnglish(db: Db, id?: string) {
  const { data, error } = await db.from("pages").select("id, title, sections").order("path");
  if (error) fail("Pages", error);
  const out: {
    id: string;
    title: string;
    pageId: string;
    english: Fields;
    specs: { key: string; label: string; rich: boolean }[];
  }[] = [];
  for (const page of data ?? []) {
    const sections = (Array.isArray(page.sections) ? page.sections : []) as DraftSection[];
    for (const section of sections) {
      if (id && section.id !== id) continue;
      if (!TRANSLATABLE[section.type]) continue;
      const english = englishOf(section);
      out.push({
        id: section.id,
        pageId: page.id,
        title: `${page.title} · ${sectionName(section)}`,
        english,
        specs: Object.keys(english).map((key) => {
          const kind = TRANSLATABLE[section.type][key.replace(/\.[0-9a-f-]{36}\./, "[].")];
          return {
            key,
            label: sectionFieldLabel(section.type, key, section),
            rich: kind === "rich",
          };
        }),
      });
    }
  }
  return out;
}

export async function listQueue(db: Db): Promise<QueueItem[]> {
  const greek = await readTranslations(db);
  const items: QueueItem[] = [];
  for (const s of await sectionEnglish(db)) {
    const item = await build(
      {
        entityType: "page_section",
        entityId: s.id,
        group: "Page sections",
        title: s.title,
        editHref: `/admin/pages/${s.pageId}`,
      },
      s.specs,
      s.english,
      greek.get(`page_section:${s.id}`),
    );
    if (item) items.push(item);
  }
  for (const [entityType, spec] of Object.entries(ITEM_SPECS)) {
    const specs = spec.fields.map((s) => ({ key: s.key, label: s.label, rich: !!s.rich }));
    for (const row of await itemEnglish(db, entityType)) {
      const item = await build(
        {
          entityType,
          entityId: row.id,
          group: spec.group,
          title: row.title,
          editHref: spec.editHref(row.id),
        },
        specs,
        row.english,
        greek.get(`${entityType}:${row.id}`),
      );
      if (item) items.push(item);
    }
  }
  return items;
}

/** The English one item shows now: what an approval is checked against. */
async function englishNow(db: Db, entityType: string, entityId: string): Promise<Fields> {
  if (entityType === "page_section") {
    const [section] = await sectionEnglish(db, entityId);
    if (!section) throw new Error("This section is not on a live page.");
    return section.english;
  }
  if (!ITEM_SPECS[entityType]) throw new Error("This content has no Greek.");
  const [row] = await itemEnglish(db, entityType, entityId);
  if (!row) throw new Error("This item no longer exists.");
  return row.english;
}

async function existing(db: Db, entityType: string, entityId: string) {
  const { data, error } = await db
    .from("content_translations")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("locale", "el")
    .maybeSingle();
  if (error) fail("Greek", error);
  return data?.id ?? null;
}

/** Greek work in progress. Never approves and never changes the live Greek. */
export async function saveDraft(
  db: Db,
  userId: string,
  entityType: string,
  entityId: string,
  fields: Fields,
): Promise<{ savedAt: string }> {
  const english = await englishNow(db, entityType, entityId);
  const draft = Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => key in english && value.trim()),
  );
  const now = new Date().toISOString();
  const id = await existing(db, entityType, entityId);
  const { error } = id
    ? await db
        .from("content_translations")
        .update({ draft_fields: draft, updated_by: userId, updated_at: now })
        .eq("id", id)
    : await db.from("content_translations").insert({
        entity_type: entityType,
        entity_id: entityId,
        locale: "el",
        fields: {},
        draft_fields: draft,
        status: "draft",
        origin: "human",
        updated_by: userId,
      });
  if (error) fail("Greek", error);
  return { savedAt: now };
}

/**
 * A person approves the Greek they are looking at. It goes live, with their
 * name on it and the English it was checked against. Every piece of English
 * needs its Greek first, so a reader never meets half a translation.
 */
export async function approve(
  db: Db,
  userId: string,
  entityType: string,
  entityId: string,
  fields: Fields,
): Promise<{ approvedAt: string }> {
  const english = await englishNow(db, entityType, entityId);
  const missing = Object.keys(english).filter((key) => !fields[key]?.trim());
  if (missing.length)
    throw new Error(
      `Write the Greek for every field before approving (${missing.length} still empty).`,
    );
  const greek = Object.fromEntries(Object.keys(english).map((key) => [key, fields[key].trim()]));
  const hash = await hashFields(english);
  const now = new Date().toISOString();
  const values = {
    fields: greek,
    draft_fields: null,
    status: "approved",
    approved_by: userId,
    approved_at: now,
    source_fields: english,
    source_hash: hash,
    english_hash: hash,
    origin: "human",
    show_english: false,
    updated_by: userId,
    updated_at: now,
  };
  const id = await existing(db, entityType, entityId);
  const { error } = id
    ? await db.from("content_translations").update(values).eq("id", id)
    : await db
        .from("content_translations")
        .insert({ ...values, entity_type: entityType, entity_id: entityId, locale: "el" });
  if (error) fail("Greek", error);
  return { approvedAt: now };
}

/** One item's Greek, for editors that show it beside the English (the media library). */
export async function itemGreek(db: Db, entityType: string, entityId: string) {
  const greek = await readTranslations(db, entityType);
  const t = greek.get(`${entityType}:${entityId}`);
  const english = await englishNow(db, entityType, entityId).catch(() => ({}) as Fields);
  const spec = ITEM_SPECS[entityType];
  return build(
    {
      entityType,
      entityId,
      group: spec?.group ?? "",
      title: "",
      editHref: null,
    },
    (spec?.fields ?? []).map((s) => ({ key: s.key, label: s.label, rich: !!s.rich })),
    english,
    t,
  );
}
