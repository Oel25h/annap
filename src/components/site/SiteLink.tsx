import { Link } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useLocale, useT } from "@/lib/i18n/context";
import { siteUrl } from "@/lib/site-url";
import { Icon } from "./Icon";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  /** A site path such as `/about#story` (English, unprefixed) or an outside link. */
  href: string;
  children: ReactNode;
  /** Mark the link current when the page is at or below its path. */
  markCurrent?: boolean;
  /** Set the link's arrow after the label: right inside the site, up-right out of it. */
  arrow?: boolean;
};

const YOUTUBE = /(^|\.)(youtube\.com|youtu\.be)$/i;

const bare = (host: string) => host.toLowerCase().replace(/^www\./, "");

/** The host of a link to another website, or null (site paths, anchors, mail, this site). */
function outsideHost(href: string): string | null {
  if (!/^https?:\/\//i.test(href)) return null;
  try {
    const host = bare(new URL(href).hostname);
    return host === bare(new URL(siteUrl()).hostname) ? null : host;
  } catch {
    return null;
  }
}

/**
 * A link from CMS content. Site paths navigate inside the app, keep the
 * reader's language and preload on intent. A link to another website opens
 * in a new tab and says so to screen readers ("opens YouTube" for YouTube),
 * unless the caller sets `target` itself and says it in its own words.
 */
export function SiteLink({ href, children, markCurrent = false, arrow = false, ...rest }: Props) {
  const locale = useLocale();
  const t = useT();
  if (!href.startsWith("/") || href.startsWith("//")) {
    const host = outsideHost(href);
    // The host, when this link opens in a new tab.
    const newTab = rest.target === undefined ? host : null;
    const rel = newTab ? [...new Set([...(rest.rel ?? "").split(/\s+/), "noopener"])] : null;
    return (
      <a
        href={href}
        {...rest}
        {...(rel ? { target: "_blank", rel: rel.filter(Boolean).join(" ") } : {})}
      >
        {children}
        {newTab && (
          <span className="sr-only">
            {YOUTUBE.test(newTab) ? t.site.opensYouTube : t.site.opensNewTab}
          </span>
        )}
        {arrow && <Icon name={host ? "arrow-ext" : "arrow-right"} />}
      </a>
    );
  }
  const url = new URL(href, "http://site.invalid");
  // Whole numbers go to the router as numbers: it would quote a numeric string (`?page=%223%22`).
  const search: Record<string, string | number> = Object.fromEntries(
    [...url.searchParams].map(([key, value]) => [
      key,
      /^[1-9]\d{0,8}$/.test(value) ? Number(value) : value,
    ]),
  );
  if (locale === "el") search.lang = "el";
  return (
    <Link
      // CMS paths are runtime strings; the router matches them like any other URL.
      to={url.pathname as "/"}
      search={search as never}
      hash={url.hash ? url.hash.slice(1) : undefined}
      // The router marks an active link aria-current="page" itself. A nav link is current
      // anywhere under its path; any other link only on exactly the URL it points to.
      activeOptions={
        markCurrent
          ? { exact: url.pathname === "/", includeSearch: false, includeHash: !!url.hash }
          : { exact: true, includeSearch: true, includeHash: !!url.hash }
      }
      {...rest}
    >
      {children}
      {arrow && <Icon name="arrow-right" />}
    </Link>
  );
}
