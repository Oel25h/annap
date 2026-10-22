import { useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { NavItem } from "@/server/site.server";
import { Icon } from "./Icon";
import { LanguageSwitch } from "./LanguageSwitch";
import { SiteLink } from "./SiteLink";

export function SiteHeader({
  siteName,
  items,
  action,
}: {
  siteName: string;
  items: NavItem[];
  action: NavItem | null;
}) {
  const t = useT();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close the menu after a navigation, and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <SiteLink className="wordmark" href="/" aria-label={t.site.home}>
          {siteName}
        </SiteLink>
        {items.length > 0 && (
          <nav className="nav" aria-label={t.site.primaryNav}>
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <SiteLink href={item.href} lang={item.labelLang} markCurrent>
                    {item.label}
                  </SiteLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="header-actions">
          <LanguageSwitch />
          {action && (
            <SiteLink
              className="btn btn-quiet btn-sm header-cta"
              href={action.href}
              lang={action.labelLang}
            >
              <Icon name="book" />
              <span>{action.label}</span>
            </SiteLink>
          )}
          <button
            className="menu-btn"
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? t.site.closeMenu : t.site.openMenu}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
      <div className="menu-panel" id={menuId} hidden={!open}>
        <div className="wrap">
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <SiteLink className="menu-link" href={item.href} lang={item.labelLang} markCurrent>
                  {item.label}
                </SiteLink>
              </li>
            ))}
          </ul>
          {action && (
            <SiteLink
              className="btn btn-primary btn-block menu-action"
              href={action.href}
              lang={action.labelLang}
            >
              {action.label}
            </SiteLink>
          )}
        </div>
      </div>
    </header>
  );
}
