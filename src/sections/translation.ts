/**
 * Greek overlays for sections.
 *
 * A section's translatable text is flattened to keys such as `title`,
 * `primary.label` or `items.<item id>.title` (items are keyed by their stable
 * id, so a translation follows an item when it is reordered). Only the keys
 * declared in TRANSLATABLE are ever read from, or written to, a translation:
 * links, media ids, embeds and settings always come from the English.
 */
import { TRANSLATABLE, type AnySection, type SectionType } from "./schemas";

export type TranslationFields = Record<string, string>;

type Item = { id: string } & Record<string, unknown>;

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object") return (value as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function setPath(obj: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split(".");
  const last = keys.pop()!;
  let target: Record<string, unknown> = obj;
  for (const key of keys) {
    const next = target[key];
    if (!next || typeof next !== "object") return;
    target = next as Record<string, unknown>;
  }
  if (typeof target[last] === "string") target[last] = value;
}

/** Every translatable key of a section with its English text (empty strings left out). */
export function extractTranslatable(section: AnySection): TranslationFields {
  const spec = TRANSLATABLE[section.type as SectionType];
  const props = section.props as Record<string, unknown>;
  const out: TranslationFields = {};
  for (const field of Object.keys(spec)) {
    const arrayMatch = field.match(/^(\w+)\[\]\.(.+)$/);
    if (arrayMatch) {
      const [, arrayKey, itemPath] = arrayMatch;
      const items = props[arrayKey];
      if (!Array.isArray(items)) continue;
      for (const item of items as Item[]) {
        const value = getPath(item, itemPath);
        if (typeof value === "string" && value.trim())
          out[`${arrayKey}.${item.id}.${itemPath}`] = value;
      }
    } else {
      const value = getPath(props, field);
      if (typeof value === "string" && value.trim()) out[field] = value;
    }
  }
  return out;
}

/** The kind ("text" or "rich") of a flattened key, or undefined if it is not translatable. */
export function translatableKind(type: SectionType, key: string): "text" | "rich" | undefined {
  const spec = TRANSLATABLE[type];
  if (spec[key]) return spec[key];
  const itemMatch = key.match(/^(\w+)\.[0-9a-f-]{36}\.(.+)$/);
  if (itemMatch) return spec[`${itemMatch[1]}[].${itemMatch[2]}`];
  return undefined;
}

/**
 * Apply approved Greek to a section. Returns the section with Greek where it
 * exists, and whether every translatable key had Greek.
 */
export function applyOverlay<S extends AnySection>(
  section: S,
  fields: TranslationFields | undefined,
): { section: S; complete: boolean } {
  const english = extractTranslatable(section);
  const keys = Object.keys(english);
  if (keys.length === 0) return { section, complete: true };
  if (!fields) return { section, complete: false };

  const props = structuredClone(section.props) as Record<string, unknown>;
  let translated = 0;
  for (const key of keys) {
    const greek = fields[key];
    if (typeof greek !== "string" || !greek.trim()) continue;
    if (!translatableKind(section.type as SectionType, key)) continue;
    const itemMatch = key.match(/^(\w+)\.([0-9a-f-]{36})\.(.+)$/);
    if (itemMatch) {
      const [, arrayKey, itemId, itemPath] = itemMatch;
      const item = (props[arrayKey] as Item[] | undefined)?.find((i) => i.id === itemId);
      if (item) setPath(item, itemPath, greek);
    } else {
      setPath(props, key, greek);
    }
    translated++;
  }
  return { section: { ...section, props } as S, complete: translated === keys.length };
}

/** Stable SHA-256 of English fields, used to tell when approved Greek is stale. */
export async function hashFields(fields: TranslationFields): Promise<string> {
  const canonical = JSON.stringify(
    Object.keys(fields)
      .sort()
      .map((key) => [key, fields[key]]),
  );
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
