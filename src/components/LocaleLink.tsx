import { useRouterState } from "@tanstack/react-router";
import type { ReactNode, MouseEventHandler } from "react";
import { useLocale } from "@/lib/i18n/context";
import { localizePath, stripLocale, type Locale } from "@/lib/i18n/locale";

type Props = {
  to: string;
  locale?: Locale;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  exact?: boolean;
  activeClassName?: string;
  "aria-label"?: string;
  role?: string;
};

/** Locale-aware anchor. Pass English paths (`/about`); prefixes `/el` when needed. */
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
  const href = localizePath(to, locale);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentBare = stripLocale(pathname);
  const targetBare = stripLocale(to);
  const active = exact
    ? currentBare === targetBare
    : targetBare === "/"
      ? currentBare === "/"
      : currentBare === targetBare || currentBare.startsWith(`${targetBare}/`);

  return (
    <a
      href={href}
      onClick={onClick}
      className={`${className}${active && activeClassName ? ` ${activeClassName}` : ""}`}
      {...rest}
    >
      {children}
    </a>
  );
}
