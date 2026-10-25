/**
 * Media library items resolved for rendering: public URLs, responsive
 * variants, focal point, placeholder colour, and Greek alt text and captions
 * where a person has approved them.
 */
import type { Locale } from "@/lib/i18n/locale";
import type { MediaMap, ResolvedMedia } from "@/sections/types";
import { fetchOverlays, overlayKey } from "./overlays.server";
import { publicObjectUrl, type PublicDb } from "./supabase-public.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The `src` fallback for browsers that ignore srcset: big enough for a laptop, small enough for a phone. */
const DEFAULT_WIDTH = 1600;

type Variant = { w: number; path: string };

function parseVariants(value: unknown): Variant[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is Variant =>
        !!v && typeof v === "object" && typeof v.w === "number" && typeof v.path === "string",
    )
    .sort((a, b) => a.w - b.w);
}

/** Collect the media ids a value refers to: any `…MediaId` or `…MediaIds` field, at any depth. */
export function collectMediaIds(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectMediaIds(item, into);
  } else if (value && typeof value === "object") {
    for (const [key, field] of Object.entries(value)) {
      if (/MediaId$/.test(key) && typeof field === "string" && UUID.test(field)) into.add(field);
      else if (/MediaIds$/.test(key) && Array.isArray(field)) {
        for (const id of field) if (typeof id === "string" && UUID.test(id)) into.add(id);
      } else if (field && typeof field === "object") collectMediaIds(field, into);
    }
  }
  return into;
}

export async function resolveMedia(
  db: PublicDb,
  ids: Iterable<string>,
  locale: Locale,
): Promise<MediaMap> {
  const wanted = [...new Set(ids)].filter((id) => UUID.test(id));
  if (wanted.length === 0) return {};

  const [assets, overlays] = await Promise.all([
    db
      .from("media_assets")
      .select(
        "id, kind, bucket, path, playback_url, mime, width, height, duration_seconds, variants, dominant_color, focal_x, focal_y, alt, caption, credit",
      )
      .in("id", wanted),
    locale === "el" ? fetchOverlays(db, { media_asset: wanted }) : Promise.resolve(new Map()),
  ]);
  if (assets.error) throw new Error(`Media: ${assets.error.message}`);

  const map: MediaMap = {};
  for (const row of assets.data ?? []) {
    const variants = parseVariants(row.variants);
    const fallback =
      [...variants].reverse().find((v) => v.w <= DEFAULT_WIDTH) ?? variants[0] ?? null;
    const stored = row.playback_url;
    const src = stored ?? publicObjectUrl(row.bucket, fallback?.path ?? row.path);
    const srcSet =
      row.kind === "image" && variants.length > 0
        ? variants.map((v) => `${publicObjectUrl(row.bucket, v.path)} ${v.w}w`).join(", ")
        : null;

    const greek = overlays.get(overlayKey("media_asset", row.id))?.fields;
    const greekAlt = greek?.alt;
    const kind = row.kind as ResolvedMedia["kind"];
    map[row.id] = {
      id: row.id,
      kind,
      src,
      original: stored ?? publicObjectUrl(row.bucket, row.path),
      srcSet,
      mime: fallback ? "image/webp" : row.mime,
      width: row.width,
      height: row.height,
      durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
      alt: greekAlt ?? row.alt,
      caption: greek?.caption ?? row.caption,
      credit: row.credit,
      textLang: locale === "el" && greekAlt ? "el" : "en",
      color: row.dominant_color,
      focalX: Number(row.focal_x),
      focalY: Number(row.focal_y),
    };
  }
  return map;
}
