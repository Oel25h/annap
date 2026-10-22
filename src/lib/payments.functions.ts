/**
 * Checkout starters. The browser gets RPC stubs only; prices, limits and
 * Stripe calls live in src/server/payments.server.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import type { Locale } from "@/lib/i18n/locale";

export type CheckoutError = "invalid" | "busy" | "verify" | "unavailable";
export type CheckoutResult = { ok: true; url: string } | { ok: false; error: CheckoutError };

function asObject<T>(input: unknown): T {
  if (typeof input !== "object" || input === null) throw new Error("invalid");
  return input as T;
}

export type CheckoutRequest = {
  kind: "book_format" | "product";
  id: string;
  locale: Locale;
  /** Where to return if the reader backs out of Checkout. */
  returnPath: string;
  turnstile?: string;
};

export const startCheckout = createServerFn({ method: "POST" })
  .validator((input: unknown) => asObject<CheckoutRequest>(input))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const payments = await import("@/server/payments.server");
    return payments.startCheckout(data);
  });

export type DonationRequest = {
  amountCents: number;
  interval: "one_off" | "month";
  locale: Locale;
  returnPath: string;
  turnstile?: string;
};

export const startDonation = createServerFn({ method: "POST" })
  .validator((input: unknown) => asObject<DonationRequest>(input))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const payments = await import("@/server/payments.server");
    return payments.startDonation(data);
  });
