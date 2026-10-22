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

/** Apply an item's approved Greek to the listed fields. Returns the language the item is now in. */
export function overlayFields<T extends Record<string, unknown>>(
  item: T,
  overlays: OverlayMap,
  entityType: string,
  id: string,
  fields: (keyof T & string)[],
): { item: T; lang: Locale } {
  const greek = overlays.get(overlayKey(entityType, id))?.fields;
  if (!greek) return { item, lang: "en" };
  const out: Record<string, unknown> = { ...item };
  let any = false;
  for (const field of fields) {
    const text = greek[field];
    if (typeof text === "string" && text.trim()) {
      out[field] = text;
      any = true;
    }
  }
  return { item: out as T, lang: any ? "el" : "en" };
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
