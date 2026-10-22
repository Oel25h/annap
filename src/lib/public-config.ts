/**
 * Public runtime configuration.
 *
 * Read from the worker's environment on every request and handed to the browser
 * through an inline script in the document head, so one build runs in every
 * environment. Never read build-time Vite env vars for configuration.
 * Only values that are safe to publish belong here.
 */
export type PublicConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  siteUrl: string;
};

declare global {
  interface Window {
    __APP_CONFIG__?: PublicConfig;
  }
}

const FALLBACK_SITE_URL = "http://localhost:3000";

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** Server only: build the public config from environment variables. */
export function readServerPublicConfig(): PublicConfig {
  return {
    supabaseUrl: process.env.SUPABASE_URL ?? "",
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
    siteUrl: trimSlash(process.env.SITE_URL || FALLBACK_SITE_URL),
  };
}

/** Works on the server and in the browser. */
export function getPublicConfig(): PublicConfig {
  if (typeof window !== "undefined") {
    if (!window.__APP_CONFIG__) {
      throw new Error("Public config missing: the document head did not include it.");
    }
    return window.__APP_CONFIG__;
  }
  return readServerPublicConfig();
}

/** The inline script that hands the config to the browser. `<` is escaped so the JSON cannot close the tag. */
export function publicConfigScript(config: PublicConfig): string {
  return `window.__APP_CONFIG__=${JSON.stringify(config).replace(/</g, "\\u003c")};`;
}
