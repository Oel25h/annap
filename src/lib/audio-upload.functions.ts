/**
 * Studio upload of a full-length recording. The browser receives a presigned
 * address and sends the file straight to R2. Admins only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/studio-auth";

const Prepare = z.object({
  mime: z.enum(["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac"]),
  bytes: z.number().int().positive(),
});

const Discard = z.object({
  key: z.string().regex(/^audio\/[0-9a-f-]{36}\/original\.(mp3|m4a|aac)$/),
});

export const prepareAudioUpload = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => Prepare.parse(raw))
  .handler(async ({ data }) => {
    const { AUDIO_MAX_BYTES, presignAudioPut } = await import("@/server/r2.server");
    if (data.bytes > AUDIO_MAX_BYTES) throw new Error("This recording is larger than 2 GB.");
    return presignAudioPut(data.mime);
  });

export const discardAudioUpload = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => Discard.parse(raw))
  .handler(async ({ data }) => {
    const { deleteAudioObject } = await import("@/server/r2.server");
    await deleteAudioObject(data.key);
    return { ok: true as const };
  });
