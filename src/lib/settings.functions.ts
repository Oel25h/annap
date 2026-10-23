/**
 * The keys screen's server functions: admins only, signed in with two
 * factors. Saved secrets never come back; only "set" and the last four
 * characters do.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/studio-auth";

const Provider = z.enum(["stripe", "youtube", "resend", "turnstile"]);
const Text = z.record(z.string().max(500)).refine((r) => Object.keys(r).length <= 10);

export const getKeys = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { readKeys } = await import("@/server/studio-settings.server");
    return readKeys();
  });

export const saveKeys = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ provider: Provider, secrets: Text, config: Text }).parse(d))
  .handler(async ({ data, context }) => {
    const settings = await import("@/server/studio-settings.server");
    return settings.saveKeys(context.userId, data.provider, data);
  });

export const disconnectKeys = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => z.object({ provider: Provider }).parse(d))
  .handler(async ({ data, context }) => {
    const { disconnect } = await import("@/server/studio-settings.server");
    await disconnect(context.userId, data.provider);
    return { ok: true };
  });
