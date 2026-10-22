/**
 * A small Stripe client over fetch: the few calls the site makes, form-encoded
 * the way the Stripe API expects, plus webhook signature checks with Web
 * Crypto. No SDK, so nothing Node-specific runs on the worker.
 */
import { readIntegration } from "./secrets.server";

const API = "https://api.stripe.com/v1";
const API_VERSION = "2025-09-30.clover";

export class StripeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

type Scalar = string | number | boolean;
type Params = {
  [key: string]: Params | Params[] | Scalar | Scalar[] | null | undefined;
};

/** { a: { b: [ { c: 1 } ], d: ["x"] } } → "a[b][0][c]=1&a[d][0]=x" */
export function encodeForm(
  params: Params,
  prefix = "",
  out = new URLSearchParams(),
): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object") encodeForm(item, `${name}[${i}]`, out);
        else out.append(`${name}[${i}]`, String(item));
      });
    } else if (typeof value === "object") encodeForm(value, name, out);
    else out.append(name, String(value));
  }
  return out;
}

export async function stripeKey(): Promise<string | null> {
  const integration = await readIntegration("stripe");
  return integration?.secrets.secretKey ?? null;
}

export async function stripeRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Params = {},
  options: { idempotencyKey?: string; key?: string } = {},
): Promise<T> {
  const key = options.key ?? (await stripeKey());
  if (!key) throw new StripeError("Stripe is not connected", 503, "not_connected");
  const body = encodeForm(params);
  const url = method === "GET" && body.size ? `${API}${path}?${body}` : `${API}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Stripe-Version": API_VERSION,
  };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  const response = await fetch(url, {
    method,
    headers,
    body: method === "POST" ? body : undefined,
  });
  const json = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string; code?: string };
  };
  if (!response.ok) {
    throw new StripeError(
      json.error?.message ?? `Stripe ${response.status}`,
      response.status,
      json.error?.code,
    );
  }
  return json;
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  client_reference_id: string | null;
  customer: string | null;
  customer_details: { email: string | null; name: string | null } | null;
  payment_intent: string | null;
  subscription: string | null;
  invoice: string | null;
  amount_subtotal: number | null;
  amount_total: number | null;
  total_details: { amount_tax: number; amount_shipping: number } | null;
  metadata: Record<string, string>;
  mode: "payment" | "subscription";
  /** Where Stripe has put the shipping address since the 2025-03-31 API. */
  collected_information?: { shipping_details: ShippingDetails | null } | null;
  shipping_details?: ShippingDetails | null;
};

export type ShippingDetails = { address: Record<string, string | null>; name: string | null };

/** The parts of a webhook event the site reads. */
export type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

export type StripeInvoice = {
  id: string;
  billing_reason: string | null;
  amount_paid: number;
  currency: string;
  customer: string | null;
  customer_email: string | null;
  customer_name: string | null;
  parent?: {
    subscription_details?: { subscription: string; metadata: Record<string, string> | null } | null;
  } | null;
};

export type StripeCharge = {
  id: string;
  payment_intent: string | null;
  amount: number;
  amount_refunded: number;
  refunded: boolean;
};

const encoder = new TextEncoder();

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Checks a webhook's Stripe-Signature header against the raw body.
 * Rejects anything older than five minutes.
 */
export async function verifyWebhook(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const timestamp = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${payload}`)),
  );
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}
