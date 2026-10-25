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
/** The studio's preview frames: the only pages that may be framed, and only by the studio. */
export const PREVIEW_PATHS = ["/preview/", "/el/preview/"];

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
  /**
   * The studio encodes images with WebAssembly in a worker, and frames its
   * page previews (see PREVIEW_PATHS) from this origin.
   */
  studio: boolean;
  /** A page preview, which only the studio on this same origin may frame. */
  preview?: boolean;
  /** This site's origin, e.g. https://example.com. */
  origin: string;
  /** Public R2 host the player streams from, when audio storage is configured. */
  audioOrigin?: string;
  /** R2 S3 host the studio uploads recordings to. */
  audioUploadOrigin?: string;
}): string {
  const supabase = supabaseOrigins(opts.supabaseUrl);
  const audio = opts.audioOrigin ? [opts.audioOrigin] : [];
  const audioUpload = opts.audioUploadOrigin ? [opts.audioUploadOrigin] : [];
  const scriptSrc = ["'self'", `'nonce-${opts.nonce}'`, TURNSTILE];
  const frameSrc = [...EMBED_HOSTS, TURNSTILE];
  if (opts.studio) {
    scriptSrc.push("'wasm-unsafe-eval'");
    frameSrc.push(...PREVIEW_PATHS.map((path) => `${opts.origin}${path}`));
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...supabase.http],
    "media-src": ["'self'", "blob:", ...supabase.http, ...audio],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...supabase.http, ...supabase.ws, TURNSTILE, ...audioUpload],
    "frame-src": frameSrc,
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    // Checkout forms go on to Stripe; download buttons go on to a signed storage link.
    "form-action": ["'self'", STRIPE_CHECKOUT, ...supabase.http],
    "frame-ancestors": [opts.preview ? "'self'" : "'none'"],
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
