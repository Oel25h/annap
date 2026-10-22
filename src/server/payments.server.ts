/**
 * Stripe Checkout for book formats, shop products and donations.
 *
 * Prices and amounts always come from the database (or, for donations, are
 * checked against fixed limits), never from the request. The order or
 * donation row is written before Checkout and keyed by our own id, which
 * Stripe hands back as client_reference_id.
 */
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { localizePath, type Locale } from "@/lib/i18n/locale";
import { readServerPublicConfig } from "@/lib/public-config";
import { guard, type FormError } from "./guard.server";
import { readIntegration } from "./secrets.server";
import { stripeRequest, type CheckoutSession } from "./stripe.server";

export type CheckoutError = FormError | "unavailable";
export type CheckoutResult = { ok: true; url: string } | { ok: false; error: CheckoutError };

/** Donation limits in cents: €1 to €10,000. */
export const DONATION_MIN = 100;
export const DONATION_MAX = 1_000_000;

const returnPath = z
  .string()
  .max(200)
  .regex(/^\/[a-z0-9/_-]*$/)
  .default("/");

const locale = z.enum(["en", "el"]);
const turnstile = z.string().max(4096).optional();

function absolute(path: string, lang: Locale) {
  return `${readServerPublicConfig().siteUrl}${localizePath(path, lang)}`;
}

/** Where Checkout sends a reader who backs out: back where they were, with a note. */
function cancelUrl(path: string, lang: Locale) {
  return `${absolute(path, lang)}?cancelled=1`;
}

async function checkoutConfig() {
  const stripe = await readIntegration("stripe");
  if (!stripe) return null;
  return { automaticTax: stripe.config.automatic_tax === true };
}

// ---------------------------------------------------------------------------
// Book formats and products
// ---------------------------------------------------------------------------

const CheckoutInput = z.object({
  kind: z.enum(["book_format", "product"]),
  id: z.string().uuid(),
  locale,
  returnPath,
  turnstile,
});

type Item = {
  title: string;
  unitCents: number;
  currency: string;
  stripePriceId: string | null;
  digital: boolean;
};

async function loadItem(kind: "book_format" | "product", id: string): Promise<Item | null> {
  if (kind === "book_format") {
    const { data } = await supabaseAdmin
      .from("book_formats")
      .select(
        "format, price_cents, currency, stripe_price_id, available, book:books(title, status)",
      )
      .eq("id", id)
      .maybeSingle();
    const book = data?.book as { title: string; status: string } | null | undefined;
    if (!data || !data.available || data.price_cents === null || book?.status !== "published")
      return null;
    return {
      title: `${book.title} (${data.format})`,
      unitCents: data.price_cents,
      currency: data.currency,
      stripePriceId: data.stripe_price_id,
      digital: data.format === "ebook" || data.format === "audiobook",
    };
  }
  const { data } = await supabaseAdmin
    .from("products")
    .select("name, price_cents, currency, stripe_price_id, status, product_type, delivery_media_id")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.status !== "published" || data.price_cents === null) return null;
  return {
    title: data.name,
    unitCents: data.price_cents,
    currency: data.currency || "EUR",
    stripePriceId: data.stripe_price_id,
    digital: !!data.delivery_media_id,
  };
}

export async function startCheckout(raw: unknown): Promise<CheckoutResult> {
  const parsed = CheckoutInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const input = parsed.data;

  const config = await checkoutConfig();
  if (!config) return { ok: false, error: "unavailable" };
  const blocked = await guard("checkout", 10, input.turnstile);
  if (blocked) return { ok: false, error: blocked };

  const item = await loadItem(input.kind, input.id);
  if (!item || item.unitCents <= 0) return { ok: false, error: "invalid" };

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .insert({
      status: "pending",
      fulfilment_status: item.digital ? "not_required" : "unfulfilled",
      currency: item.currency,
      subtotal_cents: item.unitCents,
      total_cents: item.unitCents,
      locale: input.locale,
      return_path: input.returnPath,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Orders: ${error.message}`);

  const { error: itemError } = await supabaseAdmin.from("order_items").insert({
    order_id: order.id,
    item_type: input.kind,
    item_id: input.id,
    title: item.title,
    quantity: 1,
    unit_cents: item.unitCents,
    total_cents: item.unitCents,
  });
  if (itemError) throw new Error(`Order items: ${itemError.message}`);

  const lineItem = item.stripePriceId
    ? { price: item.stripePriceId, quantity: 1 }
    : {
        price_data: {
          currency: item.currency.toLowerCase(),
          unit_amount: item.unitCents,
          product_data: { name: item.title },
          ...(config.automaticTax ? { tax_behavior: "inclusive" } : {}),
        },
        quantity: 1,
      };

  const session = await stripeRequest<CheckoutSession>(
    "POST",
    "/checkout/sessions",
    {
      mode: "payment",
      line_items: [lineItem],
      client_reference_id: order.id,
      metadata: { kind: "order", order_id: order.id },
      payment_intent_data: { metadata: { kind: "order", order_id: order.id } },
      success_url: `${absolute("/checkout/success", input.locale)}?order=${order.id}`,
      cancel_url: cancelUrl(input.returnPath, input.locale),
      locale: input.locale,
      automatic_tax: config.automaticTax ? { enabled: true } : undefined,
      billing_address_collection: config.automaticTax ? "required" : "auto",
    },
    { idempotencyKey: `order:${order.id}` },
  );

  await supabaseAdmin.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
  if (!session.url) throw new Error("Checkout session has no URL");
  return { ok: true, url: session.url };
}

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

const DonationInput = z.object({
  amountCents: z.number().int().min(DONATION_MIN).max(DONATION_MAX),
  interval: z.enum(["one_off", "month"]),
  locale,
  returnPath: returnPath.default("/foundation"),
  turnstile,
});

export async function startDonation(raw: unknown): Promise<CheckoutResult> {
  const parsed = DonationInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const input = parsed.data;

  const config = await checkoutConfig();
  if (!config) return { ok: false, error: "unavailable" };
  const blocked = await guard("donation", 10, input.turnstile);
  if (blocked) return { ok: false, error: blocked };

  const { data: donation, error } = await supabaseAdmin
    .from("donations")
    .insert({
      amount_cents: input.amountCents,
      currency: "EUR",
      interval: input.interval,
      status: "pending",
      locale: input.locale,
      return_path: input.returnPath,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Donations: ${error.message}`);

  const monthly = input.interval === "month";
  const name =
    input.locale === "el"
      ? "Δωρεά στο Patience Humanitarian Foundation"
      : "Gift to Patience Humanitarian Foundation";
  const metadata = { kind: "donation", donation_id: donation.id };
  const session = await stripeRequest<CheckoutSession>(
    "POST",
    "/checkout/sessions",
    {
      mode: monthly ? "subscription" : "payment",
      submit_type: monthly ? undefined : "donate",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: input.amountCents,
            product_data: { name },
            recurring: monthly ? { interval: "month" } : undefined,
          },
          quantity: 1,
        },
      ],
      client_reference_id: donation.id,
      metadata,
      ...(monthly ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
      success_url: `${absolute("/checkout/success", input.locale)}?donation=${donation.id}`,
      cancel_url: cancelUrl(input.returnPath, input.locale),
      locale: input.locale,
    },
    { idempotencyKey: `donation:${donation.id}` },
  );

  await supabaseAdmin
    .from("donations")
    .update({ stripe_session_id: session.id })
    .eq("id", donation.id);
  if (!session.url) throw new Error("Checkout session has no URL");
  return { ok: true, url: session.url };
}
