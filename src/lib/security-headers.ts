/**
 * Security headers for every response, and the Content-Security-Policy for
 * HTML documents. The policy is built per request: inline scripts carry a
 * fresh nonce, and the Supabase hosts come from the runtime config.
 */

const EMBED_HOSTS = [
  "https://www.youtube-nocookie.com",
  "https://player.vimeo.com",
  "https://open.spotify.com",
  "https://www.google.com",
];
const TURNSTILE = "https://challenges.cloudflare.com";
const STRIPE_CHECKOUT = "https://checkout.stripe.com";

export const STATIC_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Origins the browser talks to for a given Supabase project URL. */
export function supabaseOrigins(supabaseUrl: string): { http: string[]; ws: string[] } {
  let url: URL;
  try {
    url = new URL(supabaseUrl);
  } catch {
    return { http: [], ws: [] };
  }
  const http = [url.origin];
  // Resumable uploads go straight to the storage host in production.
  const ref = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  if (ref) http.push(`https://${ref}.storage.supabase.co`);
  const ws = [`${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`];
  return { http, ws };
}

export function contentSecurityPolicy(opts: {
  nonce: string;
  supabaseUrl: string;
  /** The studio encodes images with WebAssembly in a worker. */
  studio: boolean;
}): string {
  const supabase = supabaseOrigins(opts.supabaseUrl);
  const scriptSrc = ["'self'", `'nonce-${opts.nonce}'`, TURNSTILE];
  if (opts.studio) scriptSrc.push("'wasm-unsafe-eval'");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...supabase.http],
    "media-src": ["'self'", "blob:", ...supabase.http],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...supabase.http, ...supabase.ws, TURNSTILE],
    "frame-src": [...EMBED_HOSTS, TURNSTILE],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    // Checkout forms go on to Stripe; download buttons go on to a signed storage link.
    "form-action": ["'self'", STRIPE_CHECKOUT, ...supabase.http],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'none'"],
    "object-src": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/** Set headers on a response, copying it first if its headers are immutable. */
export function withHeaders(response: Response, headers: Record<string, string>): Response {
  try {
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
    return response;
  } catch {
    const copy = new Response(response.body, response);
    for (const [name, value] of Object.entries(headers)) copy.headers.set(name, value);
    return copy;
  }
}
