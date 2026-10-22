/**
 * Approved Greek from content_translations, fetched in one query for
 * everything a page shows. Row-level security already hides drafts and
 * translations set to "Show English until updated".
 */
import type { PublicDb } from "./supabase-public.server";

export type Overlay = { fields: Record<string, string>; stale: boolean };
export type OverlayRequest = Record<string, readonly string[]>;
export type OverlayMap = Map<string, Overlay>;

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const ENTITY_TYPE = /^[a-z_]{1,40}$/;

export function overlayKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function toFields(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, text] of Object.entries(value)) {
    if (typeof text === "string" && text.trim()) out[key] = text;
  }
  return out;
}

/** Approved Greek for each requested entity, keyed by `overlayKey`. */
export async function fetchOverlays(db: PublicDb, request: OverlayRequest): Promise<OverlayMap> {
  const groups: string[] = [];
  for (const [entityType, ids] of Object.entries(request)) {
    const safe = [...new Set(ids)].filter((id) => SAFE_ID.test(id));
    if (!ENTITY_TYPE.test(entityType) || safe.length === 0) continue;
    groups.push(`and(entity_type.eq.${entityType},entity_id.in.(${safe.join(",")}))`);
  }
  const map: OverlayMap = new Map();
  if (groups.length === 0) return map;

  const { data, error } = await db
    .from("content_translations")
    .select("entity_type, entity_id, fields, is_stale")
    .eq("locale", "el")
    .eq("status", "approved")
    .or(groups.join(","));
  if (error) throw new Error(`Greek overlays: ${error.message}`);
  for (const row of data ?? []) {
    map.set(overlayKey(row.entity_type, row.entity_id), {
      fields: toFields(row.fields),
      stale: row.is_stale === true,
    });
  }
  return map;
}
