import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { readServerPublicConfig } from "./lib/public-config";
import {
  STATIC_SECURITY_HEADERS,
  contentSecurityPolicy,
  createNonce,
  withHeaders,
} from "./lib/security-headers";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Server functions are same-origin RPC endpoints; refuse cross-site calls.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Pages that hold personal or one-time content: never cached, never indexed.
const PRIVATE_PATHS = /^\/(el\/)?(admin|auth|preview|download|confirm|checkout|unsubscribe)(\/|$)/;

// Every response gets the static security headers. HTML documents also get a
// Content-Security-Policy whose nonce the router stamps on inline scripts
// (see ssr.nonce in src/router.tsx). Vite's dev server injects its own inline
// scripts, so the policy is only sent from production builds.
const securityMiddleware = createMiddleware().server(async ({ next, request, pathname }) => {
  const nonce = createNonce();
  const result = await next({ context: { nonce } });
  const headers: Record<string, string> = { ...STATIC_SECURITY_HEADERS };
  const isHtml = result.response.headers.get("content-type")?.includes("text/html");
  if (isHtml && !import.meta.env.DEV) {
    headers["Content-Security-Policy"] = contentSecurityPolicy({
      nonce,
      supabaseUrl: readServerPublicConfig().supabaseUrl,
      studio: pathname.startsWith("/admin"),
    });
  }
  if (request.method !== "GET" || PRIVATE_PATHS.test(pathname)) {
    headers["Cache-Control"] = "no-store";
    headers["X-Robots-Tag"] = "noindex";
  } else if (isHtml || pathname.startsWith("/_serverFn")) {
    // Rendered per request; the browser may keep a copy but must check first.
    if (!result.response.headers.has("Cache-Control"))
      headers["Cache-Control"] = "private, no-cache";
  }
  return { ...result, response: withHeaders(result.response, headers) };
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [csrfMiddleware, securityMiddleware, errorMiddleware],
}));
