import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { readServerPublicConfig } from "./lib/public-config";
import {
  PREVIEW_PATHS,
  STATIC_SECURITY_HEADERS,
  contentSecurityPolicy,
  createNonce,
  withHeaders,
} from "./lib/security-headers";

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
    const publicConfig = readServerPublicConfig();
    headers["Content-Security-Policy"] = contentSecurityPolicy({
      nonce,
      supabaseUrl: publicConfig.supabaseUrl,
      studio: pathname.startsWith("/admin"),
      preview: PREVIEW_PATHS.some((path) => pathname.startsWith(path)),
      origin: new URL(request.url).origin,
      audioOrigin: originOf(process.env.R2_PUBLIC_URL),
      audioUploadOrigin: r2UploadOrigin(process.env.R2_ACCOUNT_ID),
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

function originOf(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw || !URL.canParse(raw)) return undefined;
  return new URL(raw).origin;
}

function r2UploadOrigin(accountId: string | undefined): string | undefined {
  const id = accountId?.trim();
  if (!id || !/^[a-z0-9]{32}$/i.test(id)) return undefined;
  return `https://${id}.r2.cloudflarestorage.com`;
}

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
  requestMiddleware: [csrfMiddleware, securityMiddleware, errorMiddleware],
}));
