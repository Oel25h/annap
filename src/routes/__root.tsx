import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  retainSearchParams,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportClientError } from "../lib/error-reporting";
import { getSiteShell } from "../lib/content.functions";
import { getPublicConfig, publicConfigScript } from "../lib/public-config";
import { LocaleProvider, localeFromSearch, useT } from "../lib/i18n/context";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";
import { SiteLink } from "../components/site/SiteLink";
import { StatusPage } from "../components/site/StatusPage";
import { LanguageSuggestion } from "../components/site/LanguageSuggestion";
import { AudioProvider } from "../components/audio/AudioProvider";
import { MiniPlayer } from "../components/audio/MiniPlayer";

/** Routes with their own chrome: the studio, sign-in and the link-in-bio page. */
const BARE = /^\/(admin|auth|start)(\/|$)/;

export const Route = createRootRoute({
  // `lang` is set by the locale rewrite (src/lib/i18n/rewrite.ts) and retained on every link.
  validateSearch: (search: Record<string, unknown>): { lang?: "el" } =>
    search.lang === "el" ? { lang: "el" } : {},
  search: { middlewares: [retainSearchParams(["lang"])] },
  loaderDeps: ({ search }) => ({ lang: search.lang === "el" ? ("el" as const) : ("en" as const) }),
  loader: ({ deps }) => getSiteShell({ data: deps.lang }),
  staleTime: 5 * 60_000,
  head: () => ({
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
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
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
          dangerouslySetInnerHTML={{ __html: publicConfigScript(getPublicConfig()) }}
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <LocaleProvider>
      {BARE.test(pathname) ? (
        <Outlet />
      ) : (
        <SiteChrome>
          <Outlet />
        </SiteChrome>
      )}
    </LocaleProvider>
  );
}

/** Header, main landmark and footer around every public page. */
function SiteChrome({ children }: { children: ReactNode }) {
  const t = useT();
  const shell = Route.useLoaderData();
  return (
    <AudioProvider>
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

function NotFound() {
  const t = useT();
  return (
    <StatusPage label={t.site.notFound.label} title={t.site.notFound.title}>
      <p className="lead">{t.site.notFound.body}</p>
      <ul className="status-links">
        <li>
          <SiteLink className="link" href="/books">
            {t.site.notFound.books}
          </SiteLink>
        </li>
        <li>
          <SiteLink className="link" href="/blog">
            {t.site.notFound.journal}
          </SiteLink>
        </li>
        <li>
          <SiteLink className="link" href="/contact">
            {t.site.notFound.contact}
          </SiteLink>
        </li>
        <li>
          <SiteLink className="link" href="/">
            {t.site.notFound.home}
          </SiteLink>
        </li>
      </ul>
    </StatusPage>
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
