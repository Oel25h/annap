import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportClientError } from "../lib/error-reporting";
import { absoluteUrl } from "../lib/site-url";
import { getPublicConfig, publicConfigScript } from "../lib/public-config";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { LocaleProvider, useT } from "../lib/i18n/context";
import { LocaleDetect } from "../components/LocaleDetect";
import { getLocaleFromPath } from "../lib/i18n/locale";
import { LocaleLink } from "../components/LocaleLink";

function NotFoundComponent() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="max-w-lg text-center">
        <div className="mb-6 text-[11px] uppercase tracking-[0.3em] text-gold">404</div>
        <h1 className="font-display text-6xl leading-none text-plum md:text-7xl">
          {t.common.notFoundTitle}
        </h1>
        <p className="mt-6 text-ink">{t.common.notFoundBody}</p>
        <div className="mt-8">
          <LocaleLink
            to="/"
            className="inline-flex items-center gap-2 rounded-sm bg-burgundy px-6 py-3 text-xs uppercase tracking-[0.28em] text-ivory hover:bg-plum"
          >
            {t.common.returnHome}
          </LocaleLink>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    reportClientError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl text-plum">{t.common.errorTitle}</h1>
        <p className="mt-3 text-sm text-ink">{t.common.errorBody}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-sm bg-burgundy px-5 py-3 text-xs uppercase tracking-[0.24em] text-ivory hover:bg-plum"
          >
            {t.common.tryAgain}
          </button>
          <LocaleLink
            to="/"
            className="rounded-sm border border-plum/20 px-5 py-3 text-xs uppercase tracking-[0.24em] text-plum hover:border-gold"
          >
            {t.common.goHome}
          </LocaleLink>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Anastasia Patience — Find Your Reason to Smile" },
      {
        name: "description",
        content:
          "Author, storyteller, entrepreneur. Founder of Patience Media House. Turn your pain into purpose, your ideas into products, your knowledge into opportunities.",
      },
      { name: "author", content: "Anastasia Patience" },
      { property: "og:site_name", content: "Anastasia Patience" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Anastasia Patience — Find Your Reason to Smile" },
      {
        property: "og:description",
        content:
          "Author, storyteller, entrepreneur. Founder of Patience Media House. Turn your pain into purpose, your ideas into products, your knowledge into opportunities.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Anastasia Patience — Find Your Reason to Smile" },
      {
        name: "twitter:description",
        content:
          "Author, storyteller, entrepreneur. Founder of Patience Media House. Turn your pain into purpose, your ideas into products, your knowledge into opportunities.",
      },
      { property: "og:url", content: absoluteUrl("/") },
      { property: "og:image", content: absoluteUrl("/og.jpg") },
      { name: "twitter:image", content: absoluteUrl("/og.jpg") },
    ],
    links: [
      { rel: "canonical", href: absoluteUrl("/") },
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
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: publicConfigScript(getPublicConfig()) }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function HtmlLang() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    document.documentElement.lang = getLocaleFromPath(pathname);
  }, [pathname]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Hide public site chrome on /start (link-in-bio), /admin (dashboard), and /auth.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bare =
    pathname === "/start" ||
    pathname === "/el/start" ||
    pathname === "/auth" ||
    pathname.startsWith("/admin");
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <HtmlLang />
        <LocaleDetect />
        {!bare && <SiteHeader />}
        <Outlet />
        {!bare && <SiteFooter />}
      </LocaleProvider>
    </QueryClientProvider>
  );
}
