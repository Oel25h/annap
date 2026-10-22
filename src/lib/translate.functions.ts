import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EntityType } from "@/lib/i18n/translations";
import { hashSource } from "@/lib/i18n/translations";

const EntityInput = z.object({
  entityType: z.enum([
    "blog_post",
    "book",
    "page_content",
    "masterclass",
    "product",
    "gallery_image",
    "start_link",
    "start_settings",
  ]),
  entityId: z.string().min(1),
});

const SaveInput = EntityInput.extend({
  fields: z.record(z.string()),
  approve: z.boolean().optional(),
});

const SYSTEM = `You are a professional literary localizer into Modern Greek (standard Greek as used in Cyprus/Greece).
Localize — do not translate word-for-word. Preserve Anastasia Patience's warm, faith-rooted, intimate voice.
Keep brand names in English when natural: Patience Media House, Find Your Reason to Smile, Anastasia Patience.
Preserve HTML tags exactly when present in body fields. Output ONLY valid JSON matching the requested keys.`;

async function assertAdmin(context: {
  // Structural slice — real SupabaseClient.rpc is generic; we only call has_role.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { rpc: (...args: any[]) => PromiseLike<{ data: unknown; error: unknown }> };
  userId: string;
}) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

type SupabaseAdmin = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

async function loadEnglishFields(
  admin: SupabaseAdmin,
  entityType: EntityType,
  entityId: string,
): Promise<Record<string, string>> {
  if (entityType === "blog_post") {
    const { data, error } = await admin
      .from("blog_posts")
      .select("title, excerpt, body, category")
      .eq("id", entityId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Post not found");
    return {
      title: data.title ?? "",
      excerpt: data.excerpt ?? "",
      body: data.body ?? "",
      category: data.category ?? "",
    };
  }
  if (entityType === "book") {
    const { data, error } = await admin
      .from("books")
      .select("title, tagline, description, who_for")
      .eq("id", entityId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Book not found");
    return {
      title: data.title ?? "",
      tagline: data.tagline ?? "",
      description: data.description ?? "",
      who_for: data.who_for ?? "",
    };
  }
  if (entityType === "page_content") {
    const [page, block_key] = entityId.split(":");
    const { data, error } = await admin
      .from("page_content")
      .select("value")
      .eq("page", page)
      .eq("block_key", block_key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const v =
      data?.value &&
      typeof data.value === "object" &&
      !Array.isArray(data.value) &&
      "v" in data.value
        ? String((data.value as { v?: unknown }).v ?? "")
        : "";
    return { value: v };
  }
  if (entityType === "masterclass") {
    const { data, error } = await admin
      .from("masterclass")
      .select("*")
      .eq("id", entityId)
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Masterclass not found");
    const row = data as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (
        typeof v === "string" &&
        !["id", "created_at", "updated_at", "status", "enroll_url"].includes(k)
      ) {
        out[k] = v;
      }
    }
    return out;
  }
  if (entityType === "product") {
    const { data, error } = await admin
      .from("products")
      .select("name, description, who_for, included")
      .eq("id", entityId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Product not found");
    return {
      name: data.name ?? "",
      description: data.description ?? "",
      who_for: data.who_for ?? "",
      included: data.included ?? "",
    };
  }
  if (entityType === "gallery_image") {
    const { data, error } = await admin
      .from("gallery_images")
      .select("caption, chapter")
      .eq("id", entityId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Image not found");
    return { caption: data.caption ?? "", chapter: data.chapter ?? "" };
  }
  if (entityType === "start_link") {
    const { data, error } = await admin
      .from("start_page_links")
      .select("label, sub")
      .eq("id", entityId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Link not found");
    return { label: data.label ?? "", sub: data.sub ?? "" };
  }
  if (entityType === "start_settings") {
    const { data, error } = await admin
      .from("start_page_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Settings not found");
    const row = data as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  if (entityType === "foundation_settings") {
    const { data, error } = await admin
      .from("foundation_settings" as never)
      .select("eyebrow, headline, subheadline, mission, vision, cta_label, donate_label")
      .eq("id", entityId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Foundation settings not found");
    const row = data as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  if (entityType === "foundation_story") {
    const { data, error } = await admin
      .from("foundation_stories" as never)
      .select("person_name, title, summary, body, location, category")
      .eq("id", entityId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "Foundation story not found");
    const row = data as Record<string, unknown>;
    return {
      person_name: String(row.person_name ?? ""),
      title: String(row.title ?? ""),
      summary: String(row.summary ?? ""),
      body: String(row.body ?? ""),
      location: String(row.location ?? ""),
      category: String(row.category ?? ""),
    };
  }
  throw new Error("Unsupported entity");
}

async function localizeWithGemini(fields: Record<string, string>): Promise<Record<string, string>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY for Greek draft generation.");
  }
  const model = process.env.GEMINI_TRANSLATE_MODEL || "gemini-3.6-flash";
  const keys = Object.keys(fields);
  const properties: Record<string, { type: string }> = {};
  for (const k of keys) properties[k] = { type: "string" };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Localize these English fields to native Modern Greek. Return JSON with exactly these keys: ${keys.join(", ")}.\n\nSource:\n${JSON.stringify(fields, null, 2)}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties,
          required: keys,
        },
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 240)}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(text) as Record<string, string>;
  } catch {
    throw new Error("Model returned invalid JSON. Try regenerate.");
  }
  const out: Record<string, string> = {};
  for (const k of keys) {
    out[k] = typeof parsed[k] === "string" ? parsed[k] : (fields[k] ?? "");
  }
  return out;
}

export const generateGreekDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EntityInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fields = await loadEnglishFields(supabaseAdmin, data.entityType, data.entityId);
    const source_hash = await hashSource(fields);
    const out = await localizeWithGemini(fields);

    const { data: row, error } = await supabaseAdmin
      .from("content_translations")
      .upsert(
        {
          entity_type: data.entityType,
          entity_id: data.entityId,
          locale: "el",
          fields: out,
          status: "draft",
          source_hash,
          updated_at: new Date().toISOString(),
          approved_at: null,
        },
        { onConflict: "entity_type,entity_id,locale" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveGreekTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const status = data.approve ? "approved" : "draft";
    const { data: row, error } = await supabaseAdmin
      .from("content_translations")
      .upsert(
        {
          entity_type: data.entityType,
          entity_id: data.entityId,
          locale: "el",
          fields: data.fields,
          status,
          updated_at: new Date().toISOString(),
          approved_at: data.approve ? new Date().toISOString() : null,
        },
        { onConflict: "entity_type,entity_id,locale" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setGreekApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EntityInput.extend({ approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("content_translations")
      .update({
        status: data.approve ? "approved" : "draft",
        approved_at: data.approve ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("entity_type", data.entityType)
      .eq("entity_id", data.entityId)
      .eq("locale", "el")
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
