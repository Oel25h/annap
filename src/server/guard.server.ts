/**
 * Checks every public form and checkout runs before doing anything: Turnstile
 * when it is configured, then a per-IP rate limit kept in Postgres. Keys are
 * keyed hashes, so the table never holds an IP address or an email.
 */
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { keyedHash } from "./crypto.server";
import { readIntegration } from "./secrets.server";

export type FormError = "invalid" | "busy" | "verify";

const HOUR = 3600;

/** The visitor's address, as Netlify's edge saw it (the header a client cannot set). */
export function clientIp(): string {
  const netlify = getRequestHeader("x-nf-client-connection-ip");
  if (netlify) return netlify;
  const forwarded = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/** True while under the limit. Counts the attempt. */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("hit_rate_limit", {
    _key: await keyedHash(key),
    _limit: limit,
    _window_seconds: windowSeconds,
  });
  if (error) throw new Error(`Rate limit: ${error.message}`);
  return data === true;
}

async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const integration = await readIntegration("turnstile");
  if (!integration) return true;
  if (!token) return false;
  const body = new URLSearchParams({
    secret: integration.secrets.secretKey,
    response: token,
    remoteip: clientIp(),
  });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

/** Turnstile, then the per-IP limit for this form. */
export async function guard(
  form: string,
  perHour: number,
  token: string | undefined,
): Promise<FormError | null> {
  if (!(await verifyTurnstile(token))) return "verify";
  if (!(await hit(`${form}:ip:${clientIp()}`, perHour, HOUR))) return "busy";
  return null;
}
