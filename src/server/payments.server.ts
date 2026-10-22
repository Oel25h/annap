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
import { type Locale } from "@/lib/i18n/locale";
import { guard, type FormError } from "./guard.server";
import { absoluteUrl } from "./outbox.server";
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

/** Where Checkout sends a reader who backs out: back where they were, with a note. */
function cancelUrl(path: string, lang: Locale) {
  return `${absoluteUrl(path, lang)}?cancelled=1`;
}

/**
 * Where Checkout sends a reader who paid. Stripe fills in the session id, and
 * the success page needs it as well as ours before it shows anything.
 */
function successUrl(kind: "order" | "donation", id: string, lang: Locale) {
  return `${absoluteUrl("/checkout/success", lang)}?${kind}=${id}&session={CHECKOUT_SESSION_ID}`;
}

/** Countries posted to unless the studio says otherwise: Greece, Cyprus, the EU, UK and US. */
export const DEFAULT_SHIPPING_COUNTRIES = [
  "GR",
  "CY",
  "AT",
  "BE",
  "BG",
  "HR",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "GB",
  "US",
];

async function checkoutConfig() {
  const stripe = await readIntegration("stripe");
  if (!stripe) return null;
  const countries = Array.isArray(stripe.config.shipping_countries)
    ? stripe.config.shipping_countries.filter(
        (c): c is string => typeof c === "string" && /^[A-Z]{2}$/.test(c),
      )
    : [];
  const rate = stripe.config.shipping_rate;
  return {
    automaticTax: stripe.config.automatic_tax === true,
    shippingCountries: countries.length > 0 ? countries : DEFAULT_SHIPPING_COUNTRIES,
    /** A Stripe shipping rate (shr_…) added to posted orders, if one is set. */
    shippingRate: typeof rate === "string" && /^shr_[A-Za-z0-9]+$/.test(rate) ? rate : null,
  };
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
      success_url: successUrl("order", order.id, input.locale),
      cancel_url: cancelUrl(input.returnPath, input.locale),
      locale: input.locale,
      automatic_tax: config.automaticTax ? { enabled: true } : undefined,
      billing_address_collection: config.automaticTax ? "required" : "auto",
      ...(item.digital
        ? {}
        : {
            shipping_address_collection: { allowed_countries: config.shippingCountries },
            ...(config.shippingRate
              ? { shipping_options: [{ shipping_rate: config.shippingRate }] }
              : {}),
          }),
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
      success_url: successUrl("donation", donation.id, input.locale),
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
