/**
 * After Checkout. Stripe's webhook marks orders and donations paid, hands out
 * download links for digital items and queues the receipt; the success page
 * does the same as a backup when the webhook is late. Settling only ever moves
 * a pending row, so a webhook retry or a reload never sends a second receipt.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Locale } from "@/lib/i18n/locale";
import {
  bookFiles,
  issueDownloads,
  type DownloadFile,
  type IssuedDownload,
} from "./downloads.server";
import { clientIp, hit } from "./guard.server";
import { queueEmail } from "./outbox.server";
import { readIntegration } from "./secrets.server";
import {
  stripeRequest,
  verifyWebhook,
  type CheckoutSession,
  type ShippingDetails,
  type StripeCharge,
  type StripeEvent,
  type StripeInvoice,
} from "./stripe.server";

const HOUR = 3600;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

const isAudio = (mime: string) => mime.startsWith("audio/") || mime === "application/zip";

// ---------------------------------------------------------------------------
// Settling
// ---------------------------------------------------------------------------

/** The files a bought item delivers: the product's file, or the book's ebook or audio. */
async function itemFiles(
  item: { item_type: string; item_id: string },
  lang: Locale,
): Promise<DownloadFile[]> {
  if (item.item_type === "product") {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("delivery_media_id")
      .eq("id", item.item_id)
      .maybeSingle();
    if (!product?.delivery_media_id) return [];
    const { data: media } = await supabaseAdmin
      .from("media_assets")
      .select("id, mime")
      .eq("id", product.delivery_media_id)
      .maybeSingle();
    return media ? [{ mediaId: media.id, mime: media.mime }] : [];
  }
  const { data: format } = await supabaseAdmin
    .from("book_formats")
    .select("book_id, format")
    .eq("id", item.item_id)
    .maybeSingle();
  if (!format || (format.format !== "ebook" && format.format !== "audiobook")) return [];
  const files = await bookFiles(format.book_id, "purchase", lang);
  return files.filter((file) => isAudio(file.mime) === (format.format === "audiobook"));
}

type Delivered = { title: string; links: IssuedDownload[] };

/** Fresh links for every digital item in an order. */
async function deliverOrder(orderId: string, lang: Locale): Promise<Delivered[]> {
  const { data: items, error } = await supabaseAdmin
    .from("order_items")
    .select("id, item_type, item_id, title")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) throw new Error(`Order items: ${error.message}`);
  const delivered: Delivered[] = [];
  for (const item of items ?? []) {
    const files = await itemFiles(item, lang);
    if (files.length === 0) continue;
    delivered.push({
      title: item.title,
      links: await issueDownloads({ orderItemId: item.id }, files, lang),
    });
  }
  return delivered;
}

function shippingAddress(details: ShippingDetails | null | undefined) {
  if (!details) return null;
  const a = details.address;
  return {
    name: details.name,
    line1: a.line1 ?? null,
    line2: a.line2 ?? null,
    city: a.city ?? null,
    postal_code: a.postal_code ?? null,
    state: a.state ?? null,
    country: a.country ?? null,
  };
}

export function orderNumber(id: string) {
  return id.slice(0, 8).toUpperCase();
}

/** "joel@example.com" → "j•••@example.com": enough to recognise, not to harvest. */
function maskEmail(email: string | null) {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  return at > 0 ? `${email[0]}•••${email.slice(at)}` : null;
}

async function settleOrder(orderId: string, session: CheckoutSession) {
  const shipping = session.collected_information?.shipping_details ?? session.shipping_details;
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      email: session.customer_details?.email ?? null,
      name: session.customer_details?.name ?? shipping?.name ?? null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      tax_cents: session.total_details?.amount_tax ?? 0,
      shipping_cents: session.total_details?.amount_shipping ?? 0,
      ...(session.amount_total !== null ? { total_cents: session.amount_total } : {}),
      shipping_address: shippingAddress(shipping),
    })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id, email, name, locale, currency, total_cents, fulfilment_status")
    .maybeSingle();
  if (error) throw new Error(`Orders: ${error.message}`);
  if (!order) return; // Already settled, or not ours.

  const lang = order.locale as Locale;
  const delivered = await deliverOrder(order.id, lang);
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("title, quantity, total_cents")
    .eq("order_id", order.id);
  const lines = (items ?? []).map((i) => ({
    title: i.title,
    quantity: i.quantity,
    totalCents: i.total_cents,
  }));
  const ships = order.fulfilment_status === "unfulfilled";

  if (order.email) {
    await queueEmail({
      to: order.email,
      template: "order_receipt",
      locale: lang,
      capped: false,
      params: {
        name: order.name,
        orderNumber: orderNumber(order.id),
        items: lines,
        totalCents: order.total_cents,
        currency: order.currency,
        ships,
        downloads: delivered.map((d) => ({
          title: d.title,
          links: d.links.map(({ label, url }) => ({ label, url })),
        })),
      },
    });
  }

  if (ships) {
    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("contact_email")
      .eq("id", "site")
      .maybeSingle();
    if (settings?.contact_email) {
      await queueEmail({
        to: settings.contact_email,
        template: "order_notification",
        locale: "en",
        capped: false,
        params: {
          orderNumber: orderNumber(order.id),
          name: order.name,
          email: order.email,
          items: lines,
          address: shippingAddress(shipping),
        },
      });
    }
  }
}

async function settleDonation(donationId: string, session: CheckoutSession) {
  const { data: donation, error } = await supabaseAdmin
    .from("donations")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      donor_email: session.customer_details?.email ?? null,
      donor_name: session.customer_details?.name ?? null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      stripe_subscription_id: session.subscription,
      stripe_customer_id: session.customer,
      stripe_invoice_id: session.invoice,
    })
    .eq("id", donationId)
    .eq("status", "pending")
    .select("id, donor_email, donor_name, locale, amount_cents, currency, interval")
    .maybeSingle();
  if (error) throw new Error(`Donations: ${error.message}`);
  if (!donation?.donor_email) return;
  await queueEmail({
    to: donation.donor_email,
    template: "donation_thanks",
    locale: donation.locale as Locale,
    capped: false,
    params: {
      name: donation.donor_name,
      amountCents: donation.amount_cents,
      currency: donation.currency,
      monthly: donation.interval === "month",
    },
  });
}

/** Settles a completed Checkout Session once its money has arrived. */
async function settleSession(session: CheckoutSession) {
  if (session.status !== "complete" || session.payment_status === "unpaid") return;
  const id = session.client_reference_id;
  if (!id || !UUID.test(id)) return;
  if (session.metadata?.kind === "order") await settleOrder(id, session);
  else if (session.metadata?.kind === "donation") await settleDonation(id, session);
}

/** A session that will never be paid: expired, or its bank payment failed. */
async function closeSession(session: CheckoutSession, status: "cancelled" | "failed") {
  const id = session.client_reference_id;
  if (!id || !UUID.test(id)) return;
  const table = session.metadata?.kind === "donation" ? "donations" : "orders";
  if (session.metadata?.kind !== "order" && session.metadata?.kind !== "donation") return;
  const { error } = await supabaseAdmin
    .from(table)
    .update({ status })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw new Error(`${table}: ${error.message}`);
}

/** A full refund marks the order or gift refunded and switches off its download links. */
async function refundCharge(charge: StripeCharge) {
  if (!charge.payment_intent || charge.amount_refunded < charge.amount) return;
  const refundedAt = new Date().toISOString();
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .update({ status: "refunded", refunded_at: refundedAt })
    .eq("stripe_payment_intent_id", charge.payment_intent)
    .eq("status", "paid")
    .select("id");
  if (error) throw new Error(`Orders: ${error.message}`);
  for (const order of orders ?? []) {
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("id")
      .eq("order_id", order.id);
    const ids = (items ?? []).map((i) => i.id);
    if (ids.length) {
      await supabaseAdmin
        .from("download_tokens")
        .update({ expires_at: refundedAt })
        .in("order_item_id", ids);
    }
  }
  const { error: donationError } = await supabaseAdmin
    .from("donations")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent_id", charge.payment_intent)
    .eq("status", "paid");
  if (donationError) throw new Error(`Donations: ${donationError.message}`);
}

/** Each later month of a monthly gift becomes its own paid donation. */
async function recordMonthlyGift(invoice: StripeInvoice) {
  if (invoice.billing_reason !== "subscription_cycle" || invoice.amount_paid <= 0) return;
  const details = invoice.parent?.subscription_details;
  if (!details?.subscription) return;
  const { data: first } = await supabaseAdmin
    .from("donations")
    .select("locale, return_path, donor_name, donor_email, anonymous")
    .eq("stripe_subscription_id", details.subscription)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!first && details.metadata?.kind !== "donation") return;
  const { error } = await supabaseAdmin.from("donations").insert({
    amount_cents: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    interval: "month",
    status: "paid",
    paid_at: new Date().toISOString(),
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: details.subscription,
    stripe_customer_id: invoice.customer,
    donor_email: invoice.customer_email ?? first?.donor_email ?? null,
    donor_name: invoice.customer_name ?? first?.donor_name ?? null,
    anonymous: first?.anonymous ?? false,
    locale: first?.locale ?? "en",
    return_path: first?.return_path ?? "/foundation",
  });
  // A retried event finds the invoice already recorded.
  if (error && error.code !== "23505") throw new Error(`Donations: ${error.message}`);
}

async function dispatch(event: StripeEvent) {
  const object = event.data.object;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return settleSession(object as unknown as CheckoutSession);
    case "checkout.session.async_payment_failed":
      return closeSession(object as unknown as CheckoutSession, "failed");
    case "checkout.session.expired":
      return closeSession(object as unknown as CheckoutSession, "cancelled");
    case "charge.refunded":
      return refundCharge(object as unknown as StripeCharge);
    case "invoice.paid":
      return recordMonthlyGift(object as unknown as StripeInvoice);
  }
}

/** The events the site listens for; the studio shows these when setting up the webhook. */
export const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
  "invoice.paid",
] as const;

/**
 * POST /api/stripe/webhook. Each event is handled once: its id goes into
 * stripe_events first, and comes out again if handling fails so Stripe retries.
 */
export async function handleStripeWebhook(request: Request): Promise<Response> {
  const stripe = await readIntegration("stripe");
  const secret = stripe?.secrets.webhookSecret;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  const payload = await request.text();
  const signed = await verifyWebhook(payload, request.headers.get("stripe-signature"), secret);
  if (!signed) return new Response("Bad signature", { status: 400 });

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return new Response("Bad payload", { status: 400 });
  }
  if (typeof event.id !== "string" || typeof event.type !== "string") {
    return new Response("Bad payload", { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (error?.code === "23505") return new Response("Already handled", { status: 200 });
  if (error) throw new Error(`Stripe events: ${error.message}`);

  try {
    await dispatch(event);
  } catch (failure) {
    await supabaseAdmin.from("stripe_events").delete().eq("id", event.id);
    console.error(
      "[stripe] event failed:",
      event.type,
      failure instanceof Error ? failure.message : "unknown",
    );
    return new Response("Failed", { status: 500 });
  }
  return new Response("OK", { status: 200 });
}

// ---------------------------------------------------------------------------
// The success page
// ---------------------------------------------------------------------------

/** `textLang` is the language `title` is in, so a Greek page can mark an English one. */
export type CheckoutLine = {
  title: string;
  textLang: Locale;
  quantity: number;
  totalCents: number;
};

export type CheckoutStatus =
  | { status: "invalid" | "pending" | "closed" | "refunded" }
  | {
      status: "paid";
      kind: "order";
      number: string;
      email: string | null;
      lines: CheckoutLine[];
      totalCents: number;
      currency: string;
      ships: boolean;
      downloads: { title: string; textLang: Locale; links: { label: string; action: string }[] }[];
      /** True when there are digital items but no new links this time (asked too often). */
      downloadsByEmail: boolean;
    }
  | {
      status: "paid";
      kind: "donation";
      amountCents: number;
      currency: string;
      monthly: boolean;
      email: string | null;
    };

export type StatusQuery = { kind: "order" | "donation"; id: string; session: string };

/** Asks Stripe directly when the webhook has not arrived yet. */
async function settleFromStripe(sessionId: string) {
  try {
    const session = await stripeRequest<CheckoutSession>("GET", `/checkout/sessions/${sessionId}`);
    await settleSession(session);
  } catch (failure) {
    console.warn(
      "[checkout] could not check the session:",
      failure instanceof Error ? failure.message : "unknown",
    );
  }
}

/**
 * What the success page shows. It needs both our id and Stripe's session id
 * (Stripe puts that in the return link), so an order id alone shows nothing.
 */
export async function checkoutStatus(query: StatusQuery): Promise<CheckoutStatus> {
  if (!UUID.test(query.id) || !SESSION.test(query.session)) return { status: "invalid" };
  if (!(await hit(`checkout-status:ip:${clientIp()}`, 120, HOUR))) return { status: "pending" };

  if (query.kind === "donation") {
    const read = () =>
      supabaseAdmin
        .from("donations")
        .select("status, stripe_session_id, amount_cents, currency, interval, donor_email")
        .eq("id", query.id)
        .maybeSingle();
    let { data: donation } = await read();
    if (!donation || donation.stripe_session_id !== query.session) return { status: "invalid" };
    if (donation.status === "pending") {
      await settleFromStripe(query.session);
      ({ data: donation } = await read());
      if (!donation) return { status: "invalid" };
    }
    if (donation.status === "pending") return { status: "pending" };
    if (donation.status === "refunded") return { status: "refunded" };
    if (donation.status !== "paid") return { status: "closed" };
    return {
      status: "paid",
      kind: "donation",
      amountCents: donation.amount_cents,
      currency: donation.currency,
      monthly: donation.interval === "month",
      email: maskEmail(donation.donor_email),
    };
  }

  const read = () =>
    supabaseAdmin
      .from("orders")
      .select(
        "id, status, stripe_session_id, email, total_cents, currency, locale, fulfilment_status",
      )
      .eq("id", query.id)
      .maybeSingle();
  let { data: order } = await read();
  if (!order || order.stripe_session_id !== query.session) return { status: "invalid" };
  if (order.status === "pending") {
    await settleFromStripe(query.session);
    ({ data: order } = await read());
    if (!order) return { status: "invalid" };
  }
  if (order.status === "pending") return { status: "pending" };
  if (order.status === "refunded") return { status: "refunded" };
  if (order.status !== "paid") return { status: "closed" };

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("title, quantity, total_cents, item_type, item_id")
    .eq("order_id", order.id)
    .order("created_at");
  // Titles are copied in English at checkout (see loadItem in payments.server.ts).
  const lines = (items ?? []).map((i) => ({
    title: i.title,
    textLang: "en" as const,
    quantity: i.quantity,
    totalCents: i.total_cents,
  }));

  // The emailed links are only stored as hashes, so the page issues its own,
  // a few times at most; after that it points to the email.
  const lang = order.locale as Locale;
  let downloads: Delivered[] = [];
  let downloadsByEmail = false;
  const digital = (await Promise.all((items ?? []).map((item) => itemFiles(item, lang)))).some(
    (files) => files.length > 0,
  );
  if (digital) {
    if (await hit(`checkout-downloads:${order.id}`, 5, 24 * HOUR)) {
      downloads = await deliverOrder(order.id, lang);
    } else {
      downloadsByEmail = true;
    }
  }

  return {
    status: "paid",
    kind: "order",
    number: orderNumber(order.id),
    email: maskEmail(order.email),
    lines,
    totalCents: order.total_cents,
    currency: order.currency,
    ships: order.fulfilment_status !== "not_required",
    downloads: downloads.map((d) => ({
      title: d.title,
      textLang: "en" as const,
      links: d.links.map(({ label, action }) => ({ label, action })),
    })),
    downloadsByEmail,
  };
}
