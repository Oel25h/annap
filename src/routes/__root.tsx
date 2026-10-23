import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  retainSearchParams,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import displayLatin from "../assets/fonts/noto-serif-display-latin-normal-360-400.woff2?url";
import displayGreek from "../assets/fonts/noto-serif-display-greek-normal-360-400.woff2?url";
import { reportClientError } from "../lib/error-reporting";
import { getSiteShell } from "../lib/content.functions";
import { getPublicConfig, publicConfigScript } from "../lib/public-config";
import { STRIP_HOST_MARKUP_SCRIPT } from "../lib/host-markup";
import { LocaleProvider, localeFromSearch, useT } from "../lib/i18n/context";
import { loadMessages } from "../lib/i18n/messages";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";
import { NotFoundPage, StatusPage } from "../components/site/StatusPage";
import { LanguageSuggestion } from "../components/site/LanguageSuggestion";
import { AudioProvider } from "../components/audio/AudioProvider";
import { MiniPlayer } from "../components/audio/MiniPlayer";

/** Routes with their own chrome: the studio, sign-in and the link-in-bio page. */
const BARE = /^\/(admin|auth|start)(\/|$)/;
const START = /^\/start\/?$/;

export const Route = createRootRoute({
  // `lang` is set by the locale rewrite (src/lib/i18n/rewrite.ts) and retained on every link.
  validateSearch: (search: Record<string, unknown>): { lang?: "el" } =>
    search.lang === "el" ? { lang: "el" } : {},
  search: { middlewares: [retainSearchParams(["lang"])] },
  // Only this language's copy is downloaded; it is in hand before anything renders.
  beforeLoad: async ({ search }) => {
    await loadMessages(search.lang === "el" ? "el" : "en");
  },
  loaderDeps: ({ search }) => ({ lang: search.lang === "el" ? ("el" as const) : ("en" as const) }),
  loader: ({ deps }) => getSiteShell({ data: deps.lang }),
  staleTime: 5 * 60_000,
  head: ({ match }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#fffaf5", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#1f120c", media: "(prefers-color-scheme: dark)" },
      { name: "author", content: "Anastasia Patience" },
      { property: "og:site_name", content: "Anastasia Patience" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // The roman display face sets every page's h1, so it starts with the hero image rather
      // than after the stylesheet; the italic and text faces load as the page asks for them
      ...[displayLatin, ...(match.search.lang === "el" ? [displayGreek] : [])].map((href) => ({
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href,
        crossOrigin: "anonymous" as const,
      })),
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

function RootShell({ children }: { children: ReactNode }) {
  const lang = useRouterState({ select: (s) => localeFromSearch(s.location.search) });
  const nonce = useRouter().options.ssr?.nonce;
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: STRIP_HOST_MARKUP_SCRIPT + publicConfigScript(getPublicConfig()),
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  usePageFocus();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <LocaleProvider>
      {START.test(pathname) ? (
        // The link page has no site chrome, but it is still the page's main content.
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      ) : BARE.test(pathname) ? (
        <Outlet />
      ) : (
        <SiteChrome>
          <Outlet />
        </SiteChrome>
      )}
    </LocaleProvider>
  );
}

/** A thin line at the top, shown once a navigation has been pending for 400ms. */
function NavProgress() {
  const pending = useRouterState({ select: (s) => s.status === "pending" });
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) return setSlow(false);
    const timer = setTimeout(() => setSlow(true), 400);
    return () => clearTimeout(timer);
  }, [pending]);
  return slow ? <div className="nav-progress" aria-hidden="true" /> : null;
}

/** A new page for the reader: another path, the other language, or another page of a list. */
function pageKey({ pathname, search }: { pathname: string; search: unknown }) {
  const page = (search as { page?: number } | undefined)?.page ?? 1;
  return `${pathname}|${localeFromSearch(search)}|${page}`;
}

/**
 * After a client-side move to a new page, focus its h1 (falling back to <main>)
 * so keyboard and screen-reader users start there and hear its name; without
 * it focus stays on the link, or drops to <body> when the phone menu hides it.
 * The first render, filter changes (?category=) and jumps to an anchor (left to
 * useAnchorFocus) keep focus where it is. The studio and sign-in manage their own.
 */
function usePageFocus() {
  const router = useRouter();
  useEffect(
    () =>
      router.subscribe("onRendered", ({ fromLocation: from, toLocation: to }) => {
        if (!from || pageKey(from) === pageKey(to)) return;
        if (BARE.test(to.pathname) && !START.test(to.pathname)) return;
        if (to.hash && document.getElementById(to.hash)) return;
        const target =
          document.querySelector<HTMLElement>("main h1") ?? document.getElementById("main");
        if (!target) return;
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }),
    [router],
  );
}

/**
 * After a router navigation to an anchor (the header's Free eBook, from this
 * page or another), move focus there as a native jump does, so the next Tab and
 * a screen reader carry on from the anchor instead of the header. Focus goes to
 * the anchor's first heading (made focusable with tabindex -1), or to the anchor
 * itself. A target that already holds focus keeps it (the hero Listen puts it on
 * Play), and the first load is left to the browser. On a repeat press of the
 * same URL the router restores the old scroll position, so jump there as well.
 */
function useAnchorFocus() {
  const router = useRouter();
  useEffect(
    () =>
      router.subscribe("onRendered", ({ fromLocation, toLocation }) => {
        if (!fromLocation || !toLocation.hash || fromLocation === toLocation) return;
        const target = document.getElementById(toLocation.hash);
        if (!target || target.contains(document.activeElement)) return;
        if (fromLocation.href === toLocation.href) target.scrollIntoView();
        const focusTarget = target.querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6") ?? target;
        // Make it focusable from script only; a natively focusable target keeps its tab stop.
        if (focusTarget.tabIndex < 0) focusTarget.tabIndex = -1;
        focusTarget.focus({ preventScroll: true });
      }),
    [router],
  );
}

/** Header, main landmark and footer around every public page. */
function SiteChrome({ children }: { children: ReactNode }) {
  const t = useT();
  const shell = Route.useLoaderData();
  useAnchorFocus();
  return (
    <AudioProvider>
      <NavProgress />
      <a className="skip" href="#main">
        {t.site.skipToContent}
      </a>
      <SiteHeader
        siteName={shell.settings.siteName}
        items={shell.menus.header}
        action={shell.menus.headerAction}
      />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter shell={shell} />
      <MiniPlayer />
      <LanguageSuggestion />
    </AudioProvider>
  );
}

function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    reportClientError(error, { boundary: "root" });
  }, [error]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <StatusPage title={t.site.error.title} alert>
      <p className="lead">{offline ? t.site.error.offline : t.site.error.body}</p>
      <p className="status-links">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            reset();
            void router.invalidate();
          }}
        >
          {t.site.error.tryAgain}
        </button>
      </p>
    </StatusPage>
  );
}
