import { Link, useRouterState } from "@tanstack/react-router";
import type { MouseEventHandler, ReactNode } from "react";
import { useLocale } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  /** An English, site-relative path such as `/about` or `/blog?category=faith#latest`, or an external URL. */
  to: string;
  /** Link into the other language. Defaults to the current one. */
  locale?: Locale;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  exact?: boolean;
  activeClassName?: string;
  "aria-label"?: string;
  role?: string;
};

const EXTERNAL = /^(https?:|mailto:|tel:)/i;

/**
 * Locale-aware client-side link with intent preloading. Paths may come from the
 * CMS at runtime, so `to` is a plain string rather than a typed route.
 */
export function LocaleLink({
  to,
  locale: localeOverride,
  children,
  className = "",
  onClick,
  exact,
  activeClassName,
  ...rest
}: Props) {
  const ctxLocale = useLocale();
  const locale = localeOverride ?? ctxLocale;
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  if (EXTERNAL.test(to)) {
    return (
      <a href={to} onClick={onClick} className={className} {...rest}>
        {children}
      </a>
    );
  }

  const url = new URL(to, "http://local");
  const target = url.pathname;
  const active = exact
    ? currentPath === target
    : target === "/"
      ? currentPath === "/"
      : currentPath === target || currentPath.startsWith(`${target}/`);
  const search = {
    ...Object.fromEntries(url.searchParams),
    lang: locale === "el" ? "el" : undefined,
  };

  return (
    <Link
      to={target as "/"}
      search={search as never}
      hash={url.hash ? url.hash.slice(1) : undefined}
      onClick={onClick}
      className={`${className}${active && activeClassName ? ` ${activeClassName}` : ""}`}
      aria-current={active ? "page" : undefined}
      {...rest}
    >
      {children}
    </Link>
  );
}
