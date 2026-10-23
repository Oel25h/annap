import { createRouter } from "@tanstack/react-router";
import { getGlobalStartContext } from "@tanstack/react-start";
import { routeTree } from "./routeTree.gen";
import { localeRewrite } from "./lib/i18n/rewrite";
import { localeFromSearch } from "./lib/i18n/context";
import { getMessages, provideMessages, type Messages } from "./lib/i18n/messages";
import type { Locale } from "./lib/i18n/locale";

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

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    rewrite: localeRewrite,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    ssr: { nonce: requestNonce() },
    // The page's UI copy travels with the page, so the browser has it before hydrating
    // without downloading it again (see src/lib/i18n/messages/index.ts).
    dehydrate: () => {
      const locale = localeFromSearch(router.state.location.search);
      return { locale, messages: getMessages(locale) };
    },
    hydrate: ({ locale, messages }: { locale: Locale; messages: Messages }) =>
      provideMessages(locale, messages),
  });
  return router;
};
