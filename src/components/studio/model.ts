/**
 * The page builder's data rules, shared by the studio and its server
 * functions: section names, the home page's locked rows, each section's
 * Greek status, and what a draft changes against the live page. Plain
 * functions with no React or Zod, so either side can use them.
 */
import { HOME_PINNED, TRANSLATABLE, type SectionType } from "@/sections/schemas";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** A section as the studio holds it: the stored shape, before validation. */
export type DraftSection = {
  id: string;
  type: SectionType;
  variant?: string;
  settings: {
    hidden?: boolean;
    anchor?: string;
    width?: string;
    spacing?: string;
    background?: string;
    [key: string]: Json | undefined;
  };
  props: { [key: string]: Json };
};

export type Fields = Record<string, string>;

/** One section's Greek, as the studio reads it from content_translations. */
export type GreekRow = {
  status: "draft" | "approved";
  /** The approved Greek that is live. */
  fields: Fields;
  /** Work in progress, never public. */
  draftFields: Fields | null;
  /** The English the approved Greek was checked against, when known. */
  sourceFields: Fields | null;
};

export type GreekStatus = "approved" | "draft" | "stale" | "missing";

export type StudioPageSummary = {
  id: string;
  path: string;
  title: string;
  kind: string;
  status: string;
  locked: boolean;
  sectionCount: number;
  hasDraft: boolean;
  updatedAt: string;
};

export type StudioPage = {
  page: { id: string; path: string; title: string; kind: string; status: string };
  live: DraftSection[];
  draft: DraftSection[] | null;
  draftUpdatedAt: string | null;
  greek: Record<string, GreekRow>;
  media: { id: string; label: string }[];
  books: { id: string; label: string }[];
};

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

const TYPE_NAMES: Record<SectionType, string> = {
  hero: "Hero",
  audiobook_player: "Audiobook player",
  featured_book: "Book",
  book_list: "Books",
  book_excerpts: "Excerpts",
  ebook_gate: "Free eBook",
  rich_text: "Text",
  two_column: "Two columns",
  quote: "Quote",
  image: "Image",
  gallery: "Gallery",
  video: "Videos",
  latest_posts: "Stories",
  stats: "Numbers",
  timeline: "Timeline",
  list: "List",
  testimonials: "Praise",
  products: "Shop",
  masterclasses: "Masterclasses",
  events: "Events",
  press: "Press",
  media_kit: "Media kit",
  foundation_stories: "Foundation stories",
  donation: "Donation",
  newsletter: "Newsletter",
  contact_form: "Contact form",
  faq: "Questions",
  call_to_action: "Call to action",
  link_list: "Links",
  embed: "Embed",
};

/** Types always named for what they are, whatever their anchor says. */
const NAMED_BY_TYPE = new Set<SectionType>(["hero", "audiobook_player", "quote"]);

export function typeName(type: SectionType): string {
  return TYPE_NAMES[type] ?? type;
}

/** The plain name the studio shows: the anchor ("Foundation") or the type ("Quote"). */
export function sectionName(section: Pick<DraftSection, "type" | "settings">): string {
  const anchor = section.settings.anchor?.trim();
  if (anchor && !NAMED_BY_TYPE.has(section.type)) {
    const words = anchor.replace(/-/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return typeName(section.type);
}

/** "portrait_arch" → "Portrait arch". */
export function variantName(variant: string): string {
  const words = variant.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// ---------------------------------------------------------------------------
// Locks
// ---------------------------------------------------------------------------

/** On the home page the hero and the player under it stay put: no move, hide or delete. */
export function isLocked(kind: string, sections: readonly DraftSection[], index: number): boolean {
  if (kind !== "home") return false;
  return index < HOME_PINNED.length && sections[index]?.type === HOME_PINNED[index];
}

/** Where a section may move to, or null when it is locked or the target is. */
export function moveTarget(
  kind: string,
  sections: readonly DraftSection[],
  from: number,
  to: number,
): number | null {
  if (to < 0 || to >= sections.length || to === from) return null;
  if (isLocked(kind, sections, from) || isLocked(kind, sections, to)) return null;
  return to;
}

export function moveSection<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ---------------------------------------------------------------------------
// Greek
// ---------------------------------------------------------------------------

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object") return (value as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/**
 * A section's translatable English, flattened to keys (`title`,
 * `items.<id>.title`). The same keys as extractTranslatable in
 * src/sections/translation.ts, read from a draft that may not validate yet.
 */
export function englishOf(section: Pick<DraftSection, "type" | "props">): Fields {
  const spec = TRANSLATABLE[section.type] ?? {};
  const out: Fields = {};
  for (const field of Object.keys(spec)) {
    const arrayMatch = field.match(/^(\w+)\[\]\.(.+)$/);
    if (arrayMatch) {
      const [, arrayKey, itemPath] = arrayMatch;
      const items = section.props[arrayKey];
      if (!Array.isArray(items)) continue;
      for (const item of items as { id?: string }[]) {
        const value = getPath(item, itemPath);
        if (item?.id && typeof value === "string" && value.trim())
          out[`${arrayKey}.${item.id}.${itemPath}`] = value;
      }
    } else {
      const value = getPath(section.props, field);
      if (typeof value === "string" && value.trim()) out[field] = value;
    }
  }
  return out;
}

function sameFields(a: Fields, b: Fields): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
}

/** Keys whose English differs between two versions, in the order of `now`. */
export function changedKeys(was: Fields, now: Fields): string[] {
  const keys = new Set([...Object.keys(now), ...Object.keys(was)]);
  return [...keys].filter((key) => (was[key] ?? "") !== (now[key] ?? ""));
}

/**
 * Missing → Draft → Approved, and Stale once the English changes after
 * approval. `liveEnglish` stands in for the English the Greek was checked
 * against when the translation does not record it.
 */
export function greekStatus(
  english: Fields,
  row: GreekRow | undefined,
  liveEnglish: Fields,
): GreekStatus {
  const hasDraft = !!row?.draftFields && Object.values(row.draftFields).some((v) => v.trim());
  if (!row || (Object.keys(row.fields).length === 0 && !hasDraft)) return "missing";
  if (row.status !== "approved") return "draft";
  if (!sameFields(row.sourceFields ?? liveEnglish, english)) return "stale";
  if (hasDraft && !sameFields({ ...row.fields, ...row.draftFields }, row.fields)) return "draft";
  return "approved";
}

/** A section has a Greek status only when it has English to translate. */
export function needsGreek(section: Pick<DraftSection, "type" | "props">): boolean {
  return Object.keys(englishOf(section)).length > 0;
}

// ---------------------------------------------------------------------------
// Changes against the live page
// ---------------------------------------------------------------------------

export type Change = { id: string; name: string; what: string };

const stable = (value: unknown) => JSON.stringify(value ?? null);

/**
 * The sections that moved: those outside the longest run that kept its
 * order, so moving one section up names that section, not its neighbours.
 */
function movedIds(liveOrder: string[], draftOrder: string[]): Set<string> {
  const positions = draftOrder.map((id) => liveOrder.indexOf(id));
  const length: number[] = [];
  const previous: number[] = [];
  positions.forEach((pos, i) => {
    length[i] = 1;
    previous[i] = -1;
    for (let j = 0; j < i; j++) {
      if (positions[j] < pos && length[j] + 1 > length[i]) {
        length[i] = length[j] + 1;
        previous[i] = j;
      }
    }
  });
  const kept = new Set<string>();
  let i = length.indexOf(Math.max(0, ...length));
  while (i >= 0) {
    kept.add(draftOrder[i]);
    i = previous[i];
  }
  return new Set(draftOrder.filter((id) => !kept.has(id)));
}

/** What the draft changes, one line per section, for the Publish button and dialog. */
export function draftChanges(
  live: readonly DraftSection[],
  draft: readonly DraftSection[],
): Change[] {
  const liveById = new Map(live.map((s) => [s.id, s]));
  const draftIds = new Set(draft.map((s) => s.id));
  const liveOrder = live.filter((s) => draftIds.has(s.id)).map((s) => s.id);
  const draftOrder = draft.filter((s) => liveById.has(s.id)).map((s) => s.id);
  const moved = movedIds(liveOrder, draftOrder);
  const changes: Change[] = [];

  draft.forEach((section) => {
    const name = sectionName(section);
    const before = liveById.get(section.id);
    if (!before) return changes.push({ id: section.id, name, what: "Added" });
    const what: string[] = [];
    const wasHidden = !!before.settings.hidden;
    const isHidden = !!section.settings.hidden;
    if (wasHidden !== isHidden) what.push(isHidden ? "Hidden" : "Shown");
    if (moved.has(section.id)) what.push("Moved");
    const beforeProps = before.props as Record<string, unknown>;
    const edited = Object.keys({ ...beforeProps, ...section.props }).filter(
      (key) => stable(beforeProps[key]) !== stable(section.props[key]),
    );
    if (edited.length === 1 && edited[0] === "title") what.push("Heading edited");
    else if (edited.length) what.push("Content edited");
    const { hidden: _a, ...beforeSettings } = before.settings;
    const { hidden: _b, ...settings } = section.settings;
    if (stable(beforeSettings) !== stable(settings) || before.variant !== section.variant)
      what.push("Layout changed");
    if (what.length) {
      const text = what.join(", ").toLowerCase();
      changes.push({ id: section.id, name, what: text.charAt(0).toUpperCase() + text.slice(1) });
    }
  });
  live.forEach((section) => {
    if (!draftIds.has(section.id))
      changes.push({ id: section.id, name: sectionName(section), what: "Removed" });
  });
  return changes;
}
