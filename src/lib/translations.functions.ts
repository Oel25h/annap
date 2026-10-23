/**
 * The Greek translations queue's server functions. Admins only, signed in
 * with two factors; every read and write runs with their own token. Approval
 * happens only through approveGreek, pressed by a person.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/studio-auth";

const Entity = z.object({
  entityType: z.string().regex(/^[a-z_]{1,40}$/),
  entityId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
});
const Fields = z.record(z.string().max(60_000)).refine((f) => Object.keys(f).length <= 400);
const WithFields = Entity.extend({ fields: Fields });

async function checked(entityType: string) {
  const mod = await import("@/server/studio-translations.server");
  if (!mod.isQueueEntity(entityType)) throw new Error("This content has no Greek.");
  return mod;
}

export const listGreekQueue = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { listQueue } = await import("@/server/studio-translations.server");
    return listQueue(context.supabase);
  });

export const getItemGreek = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: unknown) => Entity.parse(d))
  .handler(async ({ data, context }) => {
    const { itemGreek } = await checked(data.entityType);
    return itemGreek(context.supabase, data.entityType, data.entityId);
  });

export const saveGreekDraft = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => WithFields.parse(d))
  .handler(async ({ data, context }) => {
    const { saveDraft } = await checked(data.entityType);
    return saveDraft(context.supabase, context.userId, data.entityType, data.entityId, data.fields);
  });

export const approveGreek = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => WithFields.parse(d))
  .handler(async ({ data, context }) => {
    const { approve } = await checked(data.entityType);
    return approve(context.supabase, context.userId, data.entityType, data.entityId, data.fields);
  });
