/**
 * The newsletter screen's sending: a test to the signed-in admin, then the
 * real send once confirmed. Admins only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/studio-auth";

const Letter = z.object({ id: z.string().uuid() });

export const sendNewsletterTest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => Letter.parse(d))
  .handler(async ({ data, context }) => {
    const { sendTest } = await import("@/server/newsletter.server");
    return sendTest(context.userId, data.id);
  });

export const sendNewsletter = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => Letter.parse(d))
  .handler(async ({ data }) => {
    const { sendLetter } = await import("@/server/newsletter.server");
    return sendLetter(data.id);
  });
