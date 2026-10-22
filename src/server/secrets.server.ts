/**
 * Third-party keys entered in the studio (Stripe, YouTube, Resend, Gemini,
 * Turnstile). Each provider's secrets are one sealed JSON object in
 * integration_secrets, bound to `integration:<provider>`. Only server code
 * reads them, and never logs them.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { open, seal, type Sealed } from "./crypto.server";

export type Provider = "stripe" | "youtube" | "resend" | "gemini" | "turnstile";

export type ProviderSecrets = {
  stripe: { secretKey: string; webhookSecret?: string };
  youtube: { apiKey: string };
  resend: { apiKey: string };
  gemini: { apiKey: string };
  turnstile: { secretKey: string };
};

export type Integration<P extends Provider> = {
  secrets: ProviderSecrets[P];
  config: Record<string, unknown>;
};

const TTL_MS = 60_000;
const memo = new Map<Provider, { value: Integration<Provider> | null; expires: number }>();

/** The decrypted secrets and settings of a connected provider, or null. */
export async function readIntegration<P extends Provider>(
  provider: P,
): Promise<Integration<P> | null> {
  const hit = memo.get(provider);
  if (hit && hit.expires > Date.now()) return hit.value as Integration<P> | null;

  const { data, error } = await supabaseAdmin
    .from("integration_secrets")
    .select("ciphertext, iv, config, status")
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(`Integration ${provider}: ${error.message}`);

  let value: Integration<P> | null = null;
  if (data?.ciphertext && data.iv && data.status !== "disconnected") {
    const sealed: Sealed = { ciphertext: data.ciphertext, iv: data.iv, v: 1 };
    const secrets = await open<ProviderSecrets[P]>(sealed, `integration:${provider}`);
    value = { secrets, config: (data.config ?? {}) as Record<string, unknown> };
  }
  memo.set(provider, { value, expires: Date.now() + TTL_MS });
  return value;
}

/** Seals a provider's secrets for storage; the caller writes ciphertext, iv and last4. */
export async function sealIntegration<P extends Provider>(
  provider: P,
  secrets: ProviderSecrets[P],
) {
  const sealed = await seal(secrets, `integration:${provider}`);
  memo.delete(provider);
  return { ciphertext: sealed.ciphertext, iv: sealed.iv };
}

export function forgetIntegration(provider: Provider) {
  memo.delete(provider);
}
