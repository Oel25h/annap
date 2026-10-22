import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SECRET_KEY ??= "test";
process.env.SUPABASE_PUBLISHABLE_KEY ??= "test";
const { encodeForm, verifyWebhook } = await import("./stripe.server");

test("nested params and string lists encode the way Stripe reads them", () => {
  const body = encodeForm({
    mode: "payment",
    line_items: [{ price: "price_1", quantity: 1 }],
    shipping_address_collection: { allowed_countries: ["GR", "CY"] },
    automatic_tax: undefined,
  });
  assert.equal(
    decodeURIComponent(body.toString()),
    "mode=payment&line_items[0][price]=price_1&line_items[0][quantity]=1" +
      "&shipping_address_collection[allowed_countries][0]=GR" +
      "&shipping_address_collection[allowed_countries][1]=CY",
  );
});

async function sign(payload: string, secret: string, timestamp: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

test("webhooks verify only with the right secret, body and a fresh timestamp", async () => {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const now = Math.floor(Date.now() / 1000);
  const good = `t=${now},v1=${await sign(payload, "whsec_a", now)}`;
  assert.equal(await verifyWebhook(payload, good, "whsec_a"), true);
  assert.equal(await verifyWebhook(payload, good, "whsec_b"), false);
  assert.equal(await verifyWebhook(`${payload} `, good, "whsec_a"), false);
  assert.equal(await verifyWebhook(payload, null, "whsec_a"), false);
  const old = now - 600;
  const stale = `t=${old},v1=${await sign(payload, "whsec_a", old)}`;
  assert.equal(await verifyWebhook(payload, stale, "whsec_a"), false);
});
