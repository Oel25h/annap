import { supabase } from "@/integrations/supabase/client";
import { getApprovedTranslation } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/locale";

function isImageBlock(blockKey: string): boolean {
  return blockKey.includes("image") || blockKey.endsWith("_url") || blockKey.endsWith("_src");
}

export async function getPageBlocks(
  page: "home" | "about",
  locale: Locale = "en",
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("page_content")
    .select("block_key, value")
    .eq("page", page);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const r of data) {
    const raw = r.value;
    const v =
      raw && typeof raw === "object" && !Array.isArray(raw) && "v" in raw
        ? (raw as { v?: unknown }).v
        : undefined;
    const english = typeof v === "string" && v.trim() ? v : "";

    if (locale === "el") {
      const tr = await getApprovedTranslation("page_content", `${page}:${r.block_key}`);
      if (tr?.value?.trim()) {
        map[r.block_key] = tr.value;
      } else if (english && isImageBlock(r.block_key)) {
        // Keep shared media URLs; omit English copy so UI catalog Greek can show.
        map[r.block_key] = english;
      }
      continue;
    }

    if (english) map[r.block_key] = english;
  }
  return map;
}

/** Parse admin headline with *italic* markers into React-friendly segments. */
export function parseStarItalic(text: string): Array<{ text: string; italic: boolean }> {
  const parts: Array<{ text: string; italic: boolean }> = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), italic: false });
    parts.push({ text: m[1], italic: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), italic: false });
  if (parts.length === 0) parts.push({ text, italic: false });
  return parts;
}
