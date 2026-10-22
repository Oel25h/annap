/**
 * Where to reach a third-party API. Tests point Stripe, Resend, Gemini and
 * YouTube at local stand-ins through STRIPE_API_BASE and the like, but only
 * while the site itself runs on localhost; anywhere else the override is
 * ignored and the real API is used.
 */
import { readServerPublicConfig } from "@/lib/public-config";

type Override = "STRIPE_API_BASE" | "RESEND_API_BASE" | "GEMINI_API_BASE" | "YOUTUBE_API_BASE";

export function isLocalSite(): boolean {
  try {
    const { hostname } = new URL(readServerPublicConfig().siteUrl);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function apiBase(override: Override, real: string): string {
  const value = process.env[override]?.trim();
  return value && isLocalSite() ? value.replace(/\/+$/, "") : real;
}
