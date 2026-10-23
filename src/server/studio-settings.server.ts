/**
 * The studio's keys screen. Third-party keys live sealed in
 * integration_secrets (see secrets.server.ts), which only the service role
 * can reach; these functions run only after requireAdmin has checked the
 * caller. A saved secret is never sent back: the studio sees whether each one
 * is set and its last four characters. Nothing here logs a key.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { open, type Sealed } from "./crypto.server";
import {
  forgetIntegration,
  sealIntegration,
  type Provider,
  type ProviderSecrets,
} from "./secrets.server";

/** The providers the keys screen manages, and the secrets each one holds. */
export const SECRET_FIELDS = {
  stripe: ["secretKey", "webhookSecret"],
  youtube: ["apiKey"],
  resend: ["apiKey"],
  turnstile: ["secretKey"],
} as const satisfies Partial<Record<Provider, readonly string[]>>;

export type SettingsProvider = keyof typeof SECRET_FIELDS;

/** Non-secret settings each provider keeps in config, and how to check them. */
const CONFIG_RULES: Record<SettingsProvider, Record<string, RegExp>> = {
  stripe: {
    shipping_rate: /^(shr_[A-Za-z0-9]+)?$/,
    shipping_countries: /^([A-Z]{2}(,[A-Z]{2})*)?$/,
    automatic_tax: /^(true|false)$/,
  },
  youtube: { channel_id: /^(UC[A-Za-z0-9_-]{22})?$/ },
  resend: { from: /^.{0,200}$/, replyTo: /^([^\s@]+@[^\s@]+\.[^\s@]+)?$/ },
  turnstile: { site_key: /^([0-9A-Za-z_-]{10,100})?$/ },
};

/** What a pasted key must look like, so a wrong field is caught on save. */
const SECRET_RULES: Record<string, { pattern: RegExp; word: string }> = {
  "stripe.secretKey": {
    pattern: /^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/,
    word: "A Stripe secret key starts with sk_live_, sk_test_ or rk_.",
  },
  "stripe.webhookSecret": {
    pattern: /^whsec_[A-Za-z0-9+/=]{10,}$/,
    word: "A webhook signing secret starts with whsec_.",
  },
  "youtube.apiKey": {
    pattern: /^[A-Za-z0-9_-]{30,60}$/,
    word: "That doesn't look like a Google API key.",
  },
  "resend.apiKey": { pattern: /^re_[A-Za-z0-9_]{10,}$/, word: "A Resend key starts with re_." },
  "turnstile.secretKey": {
    pattern: /^[0-9A-Za-z_-]{20,100}$/,
    word: "That doesn't look like a Turnstile secret key.",
  },
};

export type SecretState = { set: boolean; last4: string };
export type ProviderState = {
  provider: SettingsProvider;
  status: "connected" | "disconnected" | "error";
  secrets: Record<string, SecretState>;
  config: Record<string, string>;
  updatedAt: string | null;
};

const last4 = (value: string | undefined) => (value && value.length >= 8 ? value.slice(-4) : "");

async function sealed(provider: SettingsProvider) {
  const { data, error } = await supabaseAdmin
    .from("integration_secrets")
    .select("ciphertext, iv, config, status, updated_at")
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(`Keys: ${error.message}`);
  let secrets: Record<string, string> = {};
  if (data?.ciphertext && data.iv) {
    const box: Sealed = { ciphertext: data.ciphertext, iv: data.iv, v: 1 };
    secrets = await open<Record<string, string>>(box, `integration:${provider}`);
  }
  return { row: data, secrets };
}

function configStrings(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === "string") out[key] = v;
    else if (typeof v === "boolean") out[key] = String(v);
    else if (Array.isArray(v)) out[key] = v.filter((x) => typeof x === "string").join(",");
  }
  return out;
}

export async function readKeys(): Promise<ProviderState[]> {
  const out: ProviderState[] = [];
  for (const provider of Object.keys(SECRET_FIELDS) as SettingsProvider[]) {
    const { row, secrets } = await sealed(provider);
    const state: Record<string, SecretState> = {};
    for (const field of SECRET_FIELDS[provider]) {
      const value = secrets[field];
      state[field] = { set: !!value, last4: last4(value) };
    }
    out.push({
      provider,
      status: (row?.status as ProviderState["status"]) ?? "disconnected",
      secrets: state,
      config: configStrings(row?.config),
      updatedAt: row?.updated_at ?? null,
    });
  }
  return out;
}

/**
 * Save a provider's keys. Empty secret fields keep what is stored; the
 * required secret must be set for the provider to count as connected.
 */
export async function saveKeys(
  userId: string,
  provider: SettingsProvider,
  input: { secrets: Record<string, string>; config: Record<string, string> },
): Promise<ProviderState> {
  const { secrets: current, row } = await sealed(provider);
  const next: Record<string, string> = { ...current };
  for (const field of SECRET_FIELDS[provider]) {
    const value = input.secrets[field]?.trim();
    if (!value) continue;
    const rule = SECRET_RULES[`${provider}.${field}`];
    if (rule && !rule.pattern.test(value)) throw new Error(rule.word);
    next[field] = value;
  }

  const config: Record<string, unknown> = configStrings(row?.config);
  for (const [key, pattern] of Object.entries(CONFIG_RULES[provider])) {
    if (!(key in input.config)) continue;
    const value = input.config[key].trim();
    if (!pattern.test(value)) throw new Error(`Check ${key.replace(/_/g, " ")}.`);
    config[key] = value;
  }
  if (provider === "stripe") {
    config.automatic_tax = config.automatic_tax === "true";
    config.shipping_countries = String(config.shipping_countries ?? "")
      .split(",")
      .filter(Boolean);
  }
  if (provider === "resend" && !String(config.from ?? "").trim() && next.apiKey)
    throw new Error("Add the sender, such as Anastasia Patience <letters@yourdomain.com>.");
  if (provider === "turnstile" && next.secretKey && !String(config.site_key ?? "").trim())
    throw new Error("Add the site key too; the forms need both.");

  const required = SECRET_FIELDS[provider][0];
  const connected = !!next[required];
  const box = connected
    ? await sealIntegration(provider, next as unknown as ProviderSecrets[typeof provider])
    : { ciphertext: null, iv: null };
  const { error } = await supabaseAdmin.from("integration_secrets").upsert(
    {
      provider,
      ciphertext: box.ciphertext,
      iv: box.iv,
      last4: last4(next[required]),
      config: config as never,
      status: connected ? "connected" : "disconnected",
      last_error: null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );
  if (error) throw new Error(`Keys: ${error.message}`);
  forgetIntegration(provider);
  return (await readKeys()).find((p) => p.provider === provider)!;
}

/** Remove a provider's keys; its settings stay for next time. */
export async function disconnect(userId: string, provider: SettingsProvider): Promise<void> {
  const { error } = await supabaseAdmin
    .from("integration_secrets")
    .update({
      ciphertext: null,
      iv: null,
      last4: "",
      status: "disconnected",
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", provider);
  if (error) throw new Error(`Keys: ${error.message}`);
  forgetIntegration(provider);
}
