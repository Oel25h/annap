import { supabase } from "@/integrations/supabase/client";

export type EntityType =
  | "blog_post"
  | "book"
  | "page_content"
  | "masterclass"
  | "product"
  | "gallery_image"
  | "start_link"
  | "start_settings"
  | "foundation_settings"
  | "foundation_story";

export type TranslationRow = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  locale: string;
  fields: Record<string, string>;
  status: "draft" | "approved";
  source_hash: string | null;
  approved_at: string | null;
  updated_at: string;
};

export async function getApprovedTranslation(
  entityType: EntityType,
  entityId: string,
  locale = "el",
): Promise<Record<string, string> | null> {
  const { data, error } = await supabase
    .from("content_translations")
    .select("fields, status")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("locale", locale)
    .eq("status", "approved")
    .maybeSingle();
  if (error || !data?.fields) return null;
  return data.fields as Record<string, string>;
}

export async function getTranslationRow(
  entityType: EntityType,
  entityId: string,
  locale = "el",
): Promise<TranslationRow | null> {
  const { data, error } = await supabase
    .from("content_translations")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("locale", locale)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as TranslationRow;
}

export function mergeTranslation<T extends Record<string, unknown>>(
  base: T,
  fields: Record<string, string> | null | undefined,
  keys: (keyof T & string)[],
): T {
  if (!fields) return base;
  const next = { ...base };
  for (const key of keys) {
    const v = fields[key];
    if (typeof v === "string" && v.trim()) {
      (next as Record<string, unknown>)[key] = v;
    }
  }
  return next;
}

export async function hashSource(payload: unknown): Promise<string> {
  const text = JSON.stringify(payload);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return `h${h}`;
}
