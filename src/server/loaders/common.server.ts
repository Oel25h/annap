import type { Locale } from "@/lib/i18n/locale";
import type { PageQuery } from "@/sections/types";
import { fetchOverlays, overlayKey, type OverlayMap } from "../overlays.server";
import type { PublicDb } from "../supabase-public.server";

export type LoaderContext = { db: PublicDb; locale: Locale; query?: PageQuery };

/** Approved Greek for a list of items of one type (nothing on English pages). */
export async function itemOverlays(
  ctx: LoaderContext,
  entityType: string,
  ids: string[],
): Promise<OverlayMap> {
  if (ctx.locale !== "el" || ids.length === 0) return new Map();
  return fetchOverlays(ctx.db, { [entityType]: ids });
}

/**
 * Apply an item's approved Greek to the listed fields. Returns the language the
 * item is now in, and the listed fields still in English (all of them without Greek).
 */
export function overlayFields<T extends Record<string, unknown>>(
  item: T,
  overlays: OverlayMap,
  entityType: string,
  id: string,
  fields: readonly (keyof T & string)[],
): { item: T; lang: Locale; english: (keyof T & string)[] } {
  const greek = overlays.get(overlayKey(entityType, id))?.fields;
  if (!greek) return { item, lang: "en", english: [...fields] };
  const out: Record<string, unknown> = { ...item };
  const english: (keyof T & string)[] = [];
  for (const field of fields) {
    // The studio saves some fields under their column's name (who_for).
    const text = greek[field] ?? greek[field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)];
    if (typeof text === "string" && text.trim()) out[field] = text;
    else english.push(field);
  }
  return { item: out as T, lang: english.length < fields.length ? "el" : "en", english };
}

/** Whether readers can pay here, and the Turnstile site key. One call per page at most. */
export async function publicIntegrations(
  ctx: LoaderContext,
): Promise<{ payments: boolean; turnstileSiteKey: string | null }> {
  const { data, error } = await ctx.db.rpc("public_integrations");
  if (error || !data || typeof data !== "object")
    return { payments: false, turnstileSiteKey: null };
  const value = data as { payments?: unknown; turnstileSiteKey?: unknown };
  return {
    payments: value.payments === true,
    turnstileSiteKey: typeof value.turnstileSiteKey === "string" ? value.turnstileSiteKey : null,
  };
}
