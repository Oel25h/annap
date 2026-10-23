/**
 * Public form functions. The browser gets only small RPC stubs: validation
 * (Zod), Turnstile, rate limits and writes all happen in
 * src/server/forms.server.ts. Expected failures come back as
 * `{ ok: false, error }` so forms can show the right message.
 */
import { createServerFn } from "@tanstack/react-start";
import type { Locale } from "@/lib/i18n/locale";
import type { DownloadState } from "@/server/downloads.server";

export type { DownloadState } from "@/server/downloads.server";

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

export type DownloadLink = { label: string; href: string; action: string };

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

export type ContactTopic = "general" | "speaking" | "media" | "partnerships" | "volunteering";

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

export type WaitlistRequest = {
  masterclassId: string;
  firstName: string;
  email: string;
  locale: Locale;
  website?: string;
  turnstile?: string;
};

export const joinWaitlist = createServerFn({ method: "POST" })
  .validator((input: unknown) => asObject<WaitlistRequest>(input))
  .handler(async ({ data }): Promise<{ ok: true } | FormFailure> => {
    if (data.website) return { ok: true };
    const forms = await import("@/server/forms.server");
    return forms.joinWaitlist(data);
  });

/** For the /download/$token page: what the link is for, without using it up. */
export const inspectDownload = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const { token, locale } = asObject<{ token?: unknown; locale?: unknown }>(input);
    return { token: asToken(token), locale: locale === "el" ? ("el" as const) : ("en" as const) };
  })
  .handler(async ({ data }): Promise<DownloadState> => {
    if (!data.token) return { status: "invalid" };
    const downloads = await import("@/server/downloads.server");
    return downloads.inspectDownload(data.token, data.locale);
  });
