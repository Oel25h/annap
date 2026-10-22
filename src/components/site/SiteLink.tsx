import { Link } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useLocale } from "@/lib/i18n/context";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  /** A site path such as `/about#story` (English, unprefixed) or an outside link. */
  href: string;
  children: ReactNode;
  /** Mark the link current when the page is at or below its path. */
  markCurrent?: boolean;
};

/**
 * A link from CMS content. Site paths navigate inside the app, keep the
 * reader's language and preload on intent; anything else is a plain link.
 */
export function SiteLink({ href, children, markCurrent = false, ...rest }: Props) {
  const locale = useLocale();
  if (!href.startsWith("/") || href.startsWith("//")) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  const url = new URL(href, "http://site.invalid");
  const search: Record<string, string> = Object.fromEntries(url.searchParams);
  if (locale === "el") search.lang = "el";
  return (
    <Link
      // CMS paths are runtime strings; the router matches them like any other URL.
      to={url.pathname as "/"}
      search={search as never}
      hash={url.hash ? url.hash.slice(1) : undefined}
      activeOptions={{ exact: url.pathname === "/", includeSearch: false, includeHash: false }}
      activeProps={markCurrent ? { "aria-current": "page" } : { "aria-current": undefined }}
      {...rest}
    >
      {children}
    </Link>
  );
}
