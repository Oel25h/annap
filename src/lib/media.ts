import { supabase } from "@/integrations/supabase/client";
import blogOne from "@/assets/blog-one.jpg";
import blogTwo from "@/assets/blog-two.jpg";
import blogThree from "@/assets/blog-three.jpg";
import bookDesk from "@/assets/anastasia-book-desk.jpg";
import heroPortrait from "@/assets/hero-portrait.jpg";
import portraitThree from "@/assets/anastasia-portrait-three.jpg";
import fyrtsCover from "@/assets/fyrts-cover.jpg";

/** Bundled filename → Vite URL. CMS sometimes stores `/src/assets/…` which breaks in prod. */
const BUNDLED_BY_NAME: Record<string, string> = {
  "blog-one.jpg": blogOne,
  "blog-two.jpg": blogTwo,
  "blog-three.jpg": blogThree,
  "anastasia-book-desk.jpg": bookDesk,
  "anastasia-book-desk.png": bookDesk,
  "hero-portrait.jpg": heroPortrait,
  "anastasia-portrait-three.jpg": portraitThree,
  "fyrts-cover.jpg": fyrtsCover,
  "fyrts-cover.png": fyrtsCover,
  "fyrts-cover-3d.jpg": fyrtsCover,
  "fyrts-cover-3d.png": fyrtsCover,
};

/**
 * Resolve a CMS/public media URL for <img src>.
 */
export function resolveMediaUrl(url: string | null | undefined, fallback: string = ""): string {
  const raw = url?.trim();
  if (!raw) return fallback;
  try {
    const path = raw.startsWith("http") ? new URL(raw).pathname : raw.split("?")[0];
    const base = path.split("/").pop() || "";
    if (base && BUNDLED_BY_NAME[base]) return BUNDLED_BY_NAME[base];
  } catch {
    /* keep raw */
  }
  return raw;
}

const MEDIA_BUCKET = "media";

/**
 * Upload a File to the public `media` bucket and return a stable public URL
 * suitable for storing in CMS rows and rendering on the site.
 */
export async function uploadMedia(file: File, folder = "uploads"): Promise<string> {
  if (!file || file.size === 0) throw new Error("Empty file");
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be under 10MB");

  const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = rawExt || "jpg";
  const path = `${folder.replace(/^\/+|\/+$/g, "") || "uploads"}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    const msg = error.message || "Upload failed";
    if (/bucket not found/i.test(msg)) {
      throw new Error("Media storage bucket is missing. Contact support / re-run setup.");
    }
    if (/row-level security|not authorized|policy/i.test(msg)) {
      throw new Error("Upload denied — sign in as admin and try again.");
    }
    throw new Error(msg);
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Upload succeeded but public URL is missing");
  return data.publicUrl;
}
