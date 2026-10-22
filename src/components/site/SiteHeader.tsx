import { useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { NavItem } from "@/server/site.server";
import { Icon } from "./Icon";
import { LanguageSwitch } from "./LanguageSwitch";
import { SiteLink } from "./SiteLink";

/**
 * The quiet header action. Its last word stands alone when space is short
 * (Greek below 420px reads "eBook"); the rest stays for screen readers, so
 * the name is always the full label.
 */
function HeaderAction({ action }: { action: NavItem }) {
  const cut = action.label.lastIndexOf(" ") + 1;
  return (
    <SiteLink
      className="btn btn-quiet btn-sm header-cta"
      href={action.href}
      lang={action.labelLang}
    >
      <Icon name="book" />
      <span>
        {cut > 0 && <span className="cta-pre">{action.label.slice(0, cut)}</span>}
        {action.label.slice(cut)}
      </span>
    </SiteLink>
  );
}

/** Both glyphs are drawn; CSS shows the one that matches the menu's state. */
function MenuGlyphs() {
  return (
    <>
      <Icon name="menu" className="i i-open" />
      <Icon name="close" className="i i-close" />
    </>
  );
}

/**
 * Sticky header: wordmark, the inline nav from 1180, the language switch from
 * 640, the Free eBook action from 360 and, below 1180, the menu. The menu is a
 * `<details>` disclosure until the page is interactive, then a button with a
 * static name that toggles the panel's `hidden`.
 */
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
  const [enhanced, setEnhanced] = useState(false);
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const disclosure = useRef<HTMLDetailsElement>(null);
  const href = useRouterState({ select: (s) => s.location.href });

  // Close the menu after a navigation, a jump to an anchor included.
  useEffect(() => setOpen(false), [href]);
  // Once interactive, the button takes over, open if the disclosure was.
  useEffect(() => {
    setOpen(disclosure.current?.open ?? false);
    setEnhanced(true);
  }, []);
  // Escape closes the menu and returns focus to its button. Focus or a press
  // outside the header closes it too, so the panel never hides what has focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onOutside = (event: Event) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onOutside);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onOutside);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [open]);

  const panel = (
    <div className="wrap">
      {items.length > 0 && (
        <nav aria-label={t.site.primaryNav}>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <SiteLink className="menu-link" href={item.href} lang={item.labelLang} markCurrent>
                  {item.label}
                </SiteLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <LanguageSwitch variant="menu" />
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
  );

  return (
    <header ref={header} className="site-header header-glass">
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
          {action && <HeaderAction action={action} />}
          {enhanced ? (
            <button
              ref={button}
              className="menu-btn"
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={t.site.menu}
              onClick={() => setOpen((value) => !value)}
            >
              <MenuGlyphs />
            </button>
          ) : (
            <details ref={disclosure} className="menu-disclosure">
              <summary className="menu-btn" aria-label={t.site.menu}>
                <MenuGlyphs />
              </summary>
              <div className="menu-panel">{panel}</div>
            </details>
          )}
        </div>
      </div>
      {enhanced && (
        <div className="menu-panel" id={menuId} hidden={!open}>
          {panel}
        </div>
      )}
    </header>
  );
}
