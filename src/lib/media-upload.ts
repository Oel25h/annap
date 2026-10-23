/**
 * Uploads to the media library from the studio, in the browser.
 *
 * - Images go to the public `media` bucket with WebP variants at 160, 480,
 *   960, 1600 and 2400px (never wider than the original, whose own width is
 *   the largest rung), the same ladder as scripts/seed-media.ts, plus their
 *   size and dominant colour.
 * - Audio free to stream goes to the public `audio` bucket. Paid audio and
 *   every eBook or PDF go to the private `downloads` bucket, which only
 *   signed, expiring links can read.
 *
 * Files land at library/<id>/…, then one media_assets row is written, ready.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MediaRow = Database["public"]["Tables"]["media_assets"]["Row"];
export type MediaKind = "image" | "audio" | "video" | "document";
export type MediaBucket = "media" | "audio" | "downloads";
/** Who may read a file: anyone (public buckets) or buyers only (downloads). */
export type Access = "public" | "private";

export const VARIANT_WIDTHS = [160, 480, 960, 1600, 2400];
const MAX_BYTES = 50 * 1024 * 1024;

const IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const VIDEO = ["video/mp4", "video/webm"];
const AUDIO = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac"];
const DOCUMENT = ["application/pdf", "application/epub+zip"];

/** What the file picker offers for each kind. */
export const ACCEPT: Record<MediaKind | "any", string> = {
  image: IMAGE.join(","),
  video: VIDEO.join(","),
  audio: [...AUDIO, ".mp3", ".m4a"].join(","),
  document: [...DOCUMENT, ".epub", ".pdf"].join(","),
  any: [...IMAGE, ...VIDEO, ...AUDIO, ...DOCUMENT, ".mp3", ".m4a", ".epub"].join(","),
};

/** Browsers often leave the type of an eBook or an .m4a empty. */
function mimeOf(file: File): string {
  if (file.type) return file.type === "audio/mp3" ? "audio/mpeg" : file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (
    {
      epub: "application/epub+zip",
      pdf: "application/pdf",
      mp3: "audio/mpeg",
      m4a: "audio/x-m4a",
      aac: "audio/aac",
    }[ext ?? ""] ?? ""
  );
}

export function kindOf(file: File): MediaKind | null {
  const mime = mimeOf(file);
  if (IMAGE.includes(mime)) return "image";
  if (VIDEO.includes(mime)) return "video";
  if (AUDIO.includes(mime)) return "audio";
  if (DOCUMENT.includes(mime)) return "document";
  return null;
}

/** Where a file belongs. eBooks are always private; audio follows its access. */
export function bucketFor(kind: MediaKind, access: Access): MediaBucket {
  if (kind === "document") return "downloads";
  if (kind === "audio") return access === "private" ? "downloads" : "audio";
  return "media";
}

export function publicUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** The smallest variant at least `width` wide, for thumbnails and previews. */
export function variantUrl(row: Pick<MediaRow, "bucket" | "path" | "variants">, width: number) {
  const variants = (Array.isArray(row.variants) ? row.variants : []) as {
    w: number;
    path: string;
  }[];
  const pick =
    [...variants].sort((a, b) => a.w - b.w).find((v) => v.w >= width) ?? variants.at(-1) ?? null;
  return publicUrl(row.bucket, pick?.path ?? row.path);
}

/** A short-lived link to a private file, for the studio's own preview. */
export async function signedUrl(bucket: string, path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

function extension(file: File, mime: string): string {
  const fromName =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? "";
  if (fromName && fromName.length <= 5 && fromName !== file.name.toLowerCase()) return fromName;
  return mime.split("/")[1]?.replace("epub+zip", "epub").replace("mpeg", "mp3") ?? "bin";
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("This image could not be converted."))),
      type,
      quality,
    ),
  );
}

function hex(n: number) {
  return Math.round(n).toString(16).padStart(2, "0");
}

async function imageFacts(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = bitmap;
  const widths = VARIANT_WIDTHS.filter((w) => w < width);
  widths.push(Math.min(width, VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]));

  const variants: { w: number; blob: Blob }[] = [];
  for (const w of widths) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = Math.max(1, Math.round((height * w) / width));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't resize images.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    variants.push({ w, blob: await toBlob(canvas, "image/webp", 0.8) });
  }

  // The average colour, shown while the image loads.
  const dot = document.createElement("canvas");
  dot.width = dot.height = 1;
  const dctx = dot.getContext("2d");
  let color: string | null = null;
  if (dctx) {
    dctx.drawImage(bitmap, 0, 0, 1, 1);
    const [r, g, b] = dctx.getImageData(0, 0, 1, 1).data;
    color = `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  bitmap.close();
  return { width, height, variants, color };
}

function mediaDuration(file: File, tag: "audio" | "video"): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement(tag);
    const url = URL.createObjectURL(file);
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => done(null);
    el.src = url;
  });
}

/** Turn storage errors into words the owner can act on. */
function explain(message: string): string {
  if (/mime type|not supported/i.test(message)) return "This kind of file can't go there.";
  if (/exceeded|too large|payload/i.test(message)) return "This file is larger than 50 MB.";
  if (/row-level security|not authorized|policy|jwt/i.test(message))
    return "The studio couldn't confirm you're signed in. Sign in again and retry.";
  return message;
}

/**
 * Upload one file to the library and return its row. `access` matters only
 * for audio: "private" puts a paid chapter in the downloads bucket.
 */
export async function uploadToLibrary(file: File, access: Access = "public"): Promise<MediaRow> {
  const mime = mimeOf(file);
  const kind = kindOf(file);
  if (!kind) throw new Error(`${file.name}: images, audio, video, PDF or ePub only.`);
  if (file.size === 0) throw new Error(`${file.name} is empty.`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 50 MB.`);

  const id = crypto.randomUUID();
  const bucket = bucketFor(kind, access);
  const base = `library/${id}`;
  const path = `${base}/original.${extension(file, mime)}`;
  const store = supabase.storage.from(bucket);
  const written: string[] = [];

  async function put(target: string, body: Blob, contentType: string) {
    const { error } = await store.upload(target, body, {
      contentType,
      upsert: false,
      cacheControl: bucket === "downloads" ? "3600" : "31536000",
    });
    if (error) throw new Error(explain(error.message));
    written.push(target);
  }

  try {
    let facts: {
      width?: number;
      height?: number;
      color?: string | null;
      duration?: number | null;
      variants: { w: number; path: string; bytes: number }[];
    } = { variants: [] };
    if (kind === "image") {
      const image = await imageFacts(file);
      for (const v of image.variants) {
        const target = `${base}/${v.w}.webp`;
        await put(target, v.blob, "image/webp");
        facts.variants.push({ w: v.w, path: target, bytes: v.blob.size });
      }
      facts = { ...facts, width: image.width, height: image.height, color: image.color };
    } else if (kind === "audio" || kind === "video") {
      facts.duration = await mediaDuration(file, kind);
    }
    await put(path, file, mime);

    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("media_assets")
      .insert({
        id,
        kind,
        bucket,
        path,
        mime,
        bytes: file.size,
        original_name: file.name.slice(0, 200),
        width: facts.width ?? null,
        height: facts.height ?? null,
        duration_seconds: facts.duration ? Math.round(facts.duration * 100) / 100 : null,
        variants: facts.variants,
        dominant_color: facts.color ?? null,
        status: "ready",
        created_by: user.user?.id ?? null,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(explain(error?.message ?? "The file didn't save."));
    return data;
  } catch (e) {
    if (written.length) await store.remove(written);
    throw e;
  }
}

/** Every stored object of a library item: the original and its variants. */
export function objectPaths(row: Pick<MediaRow, "path" | "variants">): string[] {
  const variants = (Array.isArray(row.variants) ? row.variants : []) as { path?: string }[];
  return [row.path, ...variants.map((v) => v.path).filter((p): p is string => !!p)];
}

/** Library rows by id. */
export async function loadMedia(ids: string[]): Promise<Record<string, MediaRow>> {
  const wanted = ids.filter(Boolean);
  if (!wanted.length) return {};
  const { data } = await supabase.from("media_assets").select("*").in("id", wanted);
  return Object.fromEntries((data ?? []).map((r) => [r.id, r as MediaRow]));
}

/**
 * Move a file between the public audio bucket and the private downloads
 * bucket (a chapter switched between free and paid). The copy lands first,
 * then the row points at it, then the old copy goes.
 */
export async function moveToBucket(id: string, to: MediaBucket): Promise<void> {
  const { data: row, error } = await supabase
    .from("media_assets")
    .select("id, bucket, path, mime")
    .eq("id", id)
    .single();
  if (error || !row) throw new Error("That file is no longer in the library.");
  if (row.bucket === to) return;
  const { data: blob, error: readError } = await supabase.storage
    .from(row.bucket)
    .download(row.path);
  if (readError || !blob) throw new Error("The file couldn't be read to move it. Try again.");
  const { error: writeError } = await supabase.storage.from(to).upload(row.path, blob, {
    contentType: row.mime,
    upsert: true,
    cacheControl: to === "downloads" ? "3600" : "31536000",
  });
  if (writeError) throw new Error(explain(writeError.message));
  const { error: rowError } = await supabase
    .from("media_assets")
    .update({ bucket: to, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (rowError) {
    await supabase.storage.from(to).remove([row.path]);
    throw new Error(explain(rowError.message));
  }
  await supabase.storage.from(row.bucket).remove([row.path]);
}
