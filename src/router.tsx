import { createRouter } from "@tanstack/react-router";
import { getGlobalStartContext } from "@tanstack/react-start";
import { routeTree } from "./routeTree.gen";
import { localeRewrite } from "./lib/i18n/rewrite";

/** The per-request CSP nonce set by the security middleware in src/start.ts. */
function requestNonce(): string | undefined {
  try {
    const context = getGlobalStartContext() as { nonce?: string } | undefined;
    return context?.nonce;
  } catch {
    // Outside a request (or before middleware ran): no nonce, no policy.
    return undefined;
  }
}

export const getRouter = () =>
  createRouter({
    routeTree,
    rewrite: localeRewrite,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    ssr: { nonce: requestNonce() },
  });
