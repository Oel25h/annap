/**
 * Public form functions. The browser gets only small RPC stubs: validation
 * (Zod), Turnstile, rate limits and writes all happen in
 * src/server/forms.server.ts. Expected failures come back as
 * `{ ok: false, error }` so forms can show the right message.
 */
import { createServerFn } from "@tanstack/react-start";
import type { Locale } from "@/lib/i18n/locale";

export type FormError = "invalid" | "busy" | "verify";
export type FormFailure = { ok: false; error: FormError };

/** Shape-only: the server validates every field again with Zod. */
function asObject<T>(input: unknown): T {
  if (typeof input !== "object" || input === null) throw new Error("invalid");
  return input as T;
}

function asToken(input: unknown): string {
  return typeof input === "string" && /^[A-Za-z0-9_-]{43}$/.test(input) ? input : "";
}

export type EbookRequest = {
  bookId: string;
  firstName: string;
  email: string;
  letters: boolean;
  locale: Locale;
  /** Honeypot: people leave it empty. */
  website?: string;
  turnstile?: string;
};

export type DownloadLink = { label: string; href: string };

export const requestFreeEbook = createServerFn({ method: "POST" })
  .validator((input: unknown) => asObject<EbookRequest>(input))
  .handler(async ({ data }): Promise<{ ok: true; downloads: DownloadLink[] } | FormFailure> => {
    // A bot filled the hidden field: look successful, do nothing.
    if (data.website) return { ok: true, downloads: [] };
    const forms = await import("@/server/forms.server");
    return forms.requestFreeEbook(data);
  });

export const refreshDownload = createServerFn({ method: "POST" })
  .validator((input: unknown) => asObject<{ token: string; turnstile?: string }>(input))
  .handler(async ({ data }): Promise<{ ok: true } | FormFailure> => {
    const forms = await import("@/server/forms.server");
    return forms.refreshDownload(data);
  });

export type SubscribeRequest = {
  email: string;
  locale: Locale;
  source?: string;
  website?: string;
  turnstile?: string;
};

export const subscribe = createServerFn({ method: "POST" })
  .validator((input: unknown) => asObject<SubscribeRequest>(input))
  .handler(async ({ data }): Promise<{ ok: true } | FormFailure> => {
    if (data.website) return { ok: true };
    const forms = await import("@/server/forms.server");
    return forms.subscribe(data);
  });

export type ContactTopic = "general" | "speaking" | "media" | "partnerships";

export type ContactRequest = {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  locale: Locale;
  website?: string;
  turnstile?: string;
};

export const sendContactMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => asObject<ContactRequest>(input))
  .handler(async ({ data }): Promise<{ ok: true } | FormFailure> => {
    if (data.website) return { ok: true };
    const forms = await import("@/server/forms.server");
    return forms.sendContactMessage(data);
  });

/** Used by the /download/$token page: counts a use and returns where the file is. */
export const redeemDownload = createServerFn({ method: "POST" })
  .validator(asToken)
  .handler(async ({ data: token }) => {
    if (!token) return { status: "invalid" as const };
    const forms = await import("@/server/forms.server");
    return forms.redeemDownload(token);
  });

/** Used by the /confirm/$token page. */
export const confirmSubscription = createServerFn({ method: "POST" })
  .validator(asToken)
  .handler(async ({ data: token }) => {
    if (!token) return "invalid" as const;
    const forms = await import("@/server/forms.server");
    return forms.confirmSubscription(token);
  });
