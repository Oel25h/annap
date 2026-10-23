/**
 * The page builder's server functions. Admins only, signed in with two
 * factors (requireAdmin); every read and write runs with their own token.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/studio-auth";
import { SECTION_TYPES } from "@/sections/schemas";
import type { DraftSection } from "@/components/studio/model";

const PageId = z.object({ pageId: z.string().uuid() });

/**
 * A section as a draft may hold it: the right shape, though its text may not
 * pass the section's own rules yet (an empty required heading). Publishing
 * checks those.
 */
const DraftSectionInput = z
  .object({
    id: z.string().uuid(),
    type: z.enum(SECTION_TYPES as [string, ...string[]]),
    variant: z.string().max(40).optional(),
    settings: z.record(z.unknown()),
    props: z.record(z.unknown()),
  })
  .strict();

const Fields = z.record(z.string().max(60_000)).refine((f) => Object.keys(f).length <= 400);

export const listStudioPages = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { listPages } = await import("@/server/studio-pages.server");
    return listPages(context.supabase);
  });

export const getStudioPage = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) => PageId.parse(d))
  .handler(async ({ data, context }) => {
    const { loadStudioPage } = await import("@/server/studio-pages.server");
    return loadStudioPage(context.supabase, data.pageId);
  });

export const saveStudioDraft = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    PageId.extend({ sections: z.array(DraftSectionInput).max(60) })
      .refine((v) => JSON.stringify(v.sections).length < 1_000_000, "Draft too large")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { saveDraft } = await import("@/server/studio-pages.server");
    return saveDraft(
      context.supabase,
      context.userId,
      data.pageId,
      data.sections as DraftSection[],
    );
  });

export const saveStudioGreek = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ sectionId: z.string().uuid(), fields: Fields }).parse(d))
  .handler(async ({ data, context }) => {
    const { saveGreekDraft } = await import("@/server/studio-pages.server");
    return saveGreekDraft(context.supabase, context.userId, data.sectionId, data.fields);
  });

export const keepStudioGreek = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ sectionId: z.string().uuid(), english: Fields }).parse(d))
  .handler(async ({ data, context }) => {
    const { keepGreek } = await import("@/server/studio-pages.server");
    await keepGreek(context.supabase, context.userId, data.sectionId, data.english);
    return { ok: true };
  });

export const publishStudioPage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => PageId.parse(d))
  .handler(async ({ data, context }) => {
    const { publishPage } = await import("@/server/studio-pages.server");
    return publishPage(context.supabase, data.pageId);
  });

export const getStudioPreview = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) => PageId.extend({ locale: z.enum(["en", "el"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { previewPage } = await import("@/server/studio-pages.server");
    return previewPage(context.supabase, data.pageId, data.locale);
  });
