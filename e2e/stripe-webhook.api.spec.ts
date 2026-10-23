import { createHmac, randomBytes } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sealIntegration } from "@/server/secrets.server";

/**
 * The Stripe webhook, end to end against the local worker and database,
 * with events shaped like Stripe's (API 2025-09-30.clover) and signed with a
 * test secret the way Stripe signs them. Nothing reaches Stripe. The local
 * Stripe settings are put back afterwards.
 */
const SECRET = "whsec_e2eLocalWebhookSecret0001";
const RUN = randomBytes(4).toString("hex");
const BUYER = `webhook-buyer-${RUN}@example.test`;
const DONOR = `webhook-donor-${RUN}@example.test`;
const FORMAT = "e2e0f0a1-0000-4000-8000-0000000000e1";
const PDF = "f1070000-0000-4000-8000-000000000300";

type Row = Record<string, unknown>;
let savedStripe: Row | null = null;
const ids = { order: "", donation: "", monthly: "" };
const events: string[] = [];

function sign(payload: string, secret = SECRET, at = Math.floor(Date.now() / 1000)) {
  const mac = createHmac("sha256", secret).update(`${at}.${payload}`).digest("hex");
  return `t=${at},v1=${mac}`;
}

async function send(
  request: APIRequestContext,
  type: string,
  object: Row,
  options: { id?: string; secret?: string } = {},
) {
  const id = options.id ?? `evt_e2e_${RUN}_${events.length}`;
  events.push(id);
  const payload = JSON.stringify({
    id,
    object: "event",
    api_version: "2025-09-30.clover",
    type,
    livemode: false,
    data: { object },
  });
  return request.post("/api/stripe/webhook", {
    data: payload,
    headers: {
      "content-type": "application/json",
      "stripe-signature": sign(payload, options.secret),
    },
  });
}

function session(kind: "order" | "donation", id: string, extra: Row = {}): Row {
  return {
    id: `cs_test_e2e${RUN}${kind}`,
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    mode: "payment",
    client_reference_id: id,
    customer: null,
    customer_details: { email: kind === "order" ? BUYER : DONOR, name: "Webhook Test" },
    payment_intent: `pi_e2e${RUN}${kind}`,
    subscription: null,
    invoice: null,
    amount_subtotal: 999,
    amount_total: 999,
    total_details: { amount_tax: 0, amount_shipping: 0, amount_discount: 0 },
    metadata: kind === "order" ? { kind, order_id: id } : { kind, donation_id: id },
    collected_information: { shipping_details: null },
    ...extra,
  };
}

async function outbox(to: string, template: string) {
  const { data } = await supabaseAdmin
    .from("email_outbox")
    .select("id")
    .eq("to_email", to)
    .eq("template", template);
  return data?.length ?? 0;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const { data: current } = await supabaseAdmin
    .from("integration_secrets")
    .select("*")
    .eq("provider", "stripe")
    .maybeSingle();
  savedStripe = current;
  const sealed = await sealIntegration("stripe", {
    secretKey: "sk_test_e2eNotARealKey0000",
    webhookSecret: SECRET,
  });
  await supabaseAdmin.from("integration_secrets").upsert({
    provider: "stripe",
    ...sealed,
    last4: "0000",
    config: (current?.config as never) ?? {},
    status: "connected",
  });

  const { data: book } = await supabaseAdmin
    .from("books")
    .select("id, title")
    .eq("status", "published")
    .limit(1)
    .single();
  await supabaseAdmin.from("book_formats").upsert({
    id: FORMAT,
    book_id: book!.id,
    format: "ebook",
    price_cents: 999,
    currency: "EUR",
    available: false,
    delivery_media_id: PDF,
  });
  const { data: order } = await supabaseAdmin
    .from("orders")
    .insert({
      status: "pending",
      fulfilment_status: "not_required",
      subtotal_cents: 999,
      total_cents: 999,
      stripe_session_id: `cs_test_e2e${RUN}order`,
    })
    .select("id")
    .single();
  ids.order = order!.id;
  await supabaseAdmin.from("order_items").insert({
    order_id: ids.order,
    item_type: "book_format",
    item_id: FORMAT,
    title: `${book!.title} (ebook)`,
    unit_cents: 999,
    total_cents: 999,
  });
  const { data: gift } = await supabaseAdmin
    .from("donations")
    .insert({ amount_cents: 2500, interval: "one_off", status: "pending" })
    .select("id")
    .single();
  ids.donation = gift!.id;
  const { data: monthly } = await supabaseAdmin
    .from("donations")
    .insert({ amount_cents: 1000, interval: "month", status: "pending" })
    .select("id")
    .single();
  ids.monthly = monthly!.id;
});

test.afterAll(async () => {
  await supabaseAdmin.from("email_outbox").delete().in("to_email", [BUYER, DONOR]);
  if (ids.order) await supabaseAdmin.from("orders").delete().eq("id", ids.order);
  await supabaseAdmin.from("donations").delete().like("stripe_subscription_id", `sub_e2e${RUN}%`);
  await supabaseAdmin
    .from("donations")
    .delete()
    .in("id", [ids.donation, ids.monthly].filter(Boolean));
  await supabaseAdmin.from("book_formats").delete().eq("id", FORMAT);
  await supabaseAdmin.from("stripe_events").delete().like("id", `evt_e2e_${RUN}%`);
  if (savedStripe) await supabaseAdmin.from("integration_secrets").upsert(savedStripe as never);
  else await supabaseAdmin.from("integration_secrets").delete().eq("provider", "stripe");
});

test("an event signed with another secret, or unsigned, is refused", async ({ request }) => {
  const forged = await send(request, "checkout.session.completed", session("order", ids.order), {
    secret: "whsec_someoneElse0000000000",
  });
  expect(forged.status()).toBe(400);
  const unsigned = await request.post("/api/stripe/webhook", {
    data: JSON.stringify({ id: "evt_x", type: "charge.refunded", data: { object: {} } }),
  });
  expect(unsigned.status()).toBe(400);
  const { data } = await supabaseAdmin.from("orders").select("status").eq("id", ids.order).single();
  expect(data!.status).toBe("pending");
});

test("a paid order gets download links and one receipt, even when Stripe resends", async ({
  request,
}) => {
  const id = `evt_e2e_${RUN}_paid`;
  const first = await send(request, "checkout.session.completed", session("order", ids.order), {
    id,
  });
  expect(first.status()).toBe(200);
  const again = await send(request, "checkout.session.completed", session("order", ids.order), {
    id,
  });
  expect(again.status()).toBe(200);
  expect(await again.text()).toBe("Already handled");

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("status, email, paid_at, stripe_payment_intent_id")
    .eq("id", ids.order)
    .single();
  expect(order).toMatchObject({ status: "paid", email: BUYER });
  expect(order!.paid_at).toBeTruthy();

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("id")
    .eq("order_id", ids.order);
  const { data: tokens } = await supabaseAdmin
    .from("download_tokens")
    .select("media_id, expires_at")
    .in(
      "order_item_id",
      (items ?? []).map((i) => i.id),
    );
  expect(tokens).toHaveLength(1);
  expect(tokens![0].media_id).toBe(PDF);
  expect(await outbox(BUYER, "order_receipt")).toBe(1);

  // The same payment told again under a new event id changes nothing either.
  await send(request, "checkout.session.async_payment_succeeded", session("order", ids.order));
  expect(await outbox(BUYER, "order_receipt")).toBe(1);
});

test("a full refund marks the order refunded and ends its download links", async ({ request }) => {
  const refunded = await send(request, "charge.refunded", {
    id: `ch_e2e${RUN}`,
    object: "charge",
    payment_intent: `pi_e2e${RUN}order`,
    amount: 999,
    amount_refunded: 999,
    refunded: true,
  });
  expect(refunded.status()).toBe(200);
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("status, refunded_at")
    .eq("id", ids.order)
    .single();
  expect(order!.status).toBe("refunded");
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("id")
    .eq("order_id", ids.order);
  const { data: tokens } = await supabaseAdmin
    .from("download_tokens")
    .select("expires_at")
    .in(
      "order_item_id",
      (items ?? []).map((i) => i.id),
    );
  for (const token of tokens ?? []) {
    expect(Date.parse(token.expires_at)).toBeLessThanOrEqual(Date.now());
  }
});

test("a one-off gift is marked paid and thanked once", async ({ request }) => {
  const res = await send(
    request,
    "checkout.session.completed",
    session("donation", ids.donation, { amount_total: 2500, amount_subtotal: 2500 }),
  );
  expect(res.status()).toBe(200);
  const { data } = await supabaseAdmin
    .from("donations")
    .select("status, donor_email")
    .eq("id", ids.donation)
    .single();
  expect(data).toMatchObject({ status: "paid", donor_email: DONOR });
  expect(await outbox(DONOR, "donation_thanks")).toBe(1);
});

test("a monthly gift records each month once and thanks for each", async ({ request }) => {
  const subscription = `sub_e2e${RUN}`;
  const start = await send(
    request,
    "checkout.session.completed",
    session("donation", ids.monthly, {
      id: `cs_test_e2e${RUN}monthly`,
      mode: "subscription",
      payment_intent: null,
      subscription,
      invoice: `in_e2e${RUN}first`,
      customer: `cus_e2e${RUN}`,
      amount_total: 1000,
    }),
  );
  expect(start.status()).toBe(200);
  const before = await outbox(DONOR, "donation_thanks");

  const invoice = {
    id: `in_e2e${RUN}month2`,
    object: "invoice",
    billing_reason: "subscription_cycle",
    amount_paid: 1000,
    currency: "eur",
    customer: `cus_e2e${RUN}`,
    customer_email: DONOR,
    customer_name: "Webhook Test",
    parent: {
      type: "subscription_details",
      subscription_details: { subscription, metadata: { kind: "donation" } },
    },
  };
  expect((await send(request, "invoice.paid", invoice)).status()).toBe(200);
  // Stripe can send the same invoice under a second event; it is recorded once.
  expect((await send(request, "invoice.paid", invoice)).status()).toBe(200);

  const { data: months } = await supabaseAdmin
    .from("donations")
    .select("status, interval, stripe_invoice_id")
    .eq("stripe_subscription_id", subscription)
    .order("created_at");
  expect(months).toHaveLength(2);
  expect(months!.every((m) => m.status === "paid" && m.interval === "month")).toBe(true);
  expect(await outbox(DONOR, "donation_thanks")).toBe(before + 1);

  // The first invoice of a subscription is the checkout itself: not a second row.
  await send(request, "invoice.paid", {
    ...invoice,
    id: `in_e2e${RUN}first`,
    billing_reason: "subscription_create",
  });
  const { count } = await supabaseAdmin
    .from("donations")
    .select("id", { count: "exact", head: true })
    .eq("stripe_subscription_id", subscription);
  expect(count).toBe(2);
});
