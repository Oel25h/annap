import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/studio-auth";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const BookPatch = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    tagline: z.string().nullable().optional(),
    cover_url: z.string().nullable().optional(),
    amazon_url: z.string().nullable().optional(),
    ebook_url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    who_for: z.string().nullable().optional(),
    // DB CHECK: published | hidden (map legacy "draft" if clients send it)
    status: z
      .enum(["published", "hidden", "draft"])
      .transform((s) => (s === "draft" ? "hidden" : s))
      .optional(),
    sort_order: z.number().optional(),
    formats: z.array(z.string()).optional(),
  }),
});

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const updateBook = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => BookPatch.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("books").update(data.patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Book visibility: DB CHECK is published | hidden (not draft — that is blog/translations only). */
export const BOOK_STATUSES = ["published", "hidden"] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export const createBook = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    // unique slug based on timestamp so admin can rename without conflicts
    const suffix = Date.now().toString(36);
    const { data: existing } = await context.supabase
      .from("books")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder = ((existing?.[0]?.sort_order as number | undefined) ?? 0) + 10;
    const { data, error } = await context.supabase
      .from("books")
      .insert({
        slug: `new-book-${suffix}`,
        title: "New book",
        tagline: null,
        description: null,
        who_for: null,
        cover_url: null,
        amazon_url: null,
        ebook_url: null,
        formats: [],
        // hidden until editor publishes — matches books.status CHECK
        status: "hidden",
        sort_order: nextOrder,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  });

export const deleteBook = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("books").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
