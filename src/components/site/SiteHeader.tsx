import { useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/context";
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

/** A path is current on itself and on anything under it, except the home page. */
function isHere(href: string, path: string): boolean {
  const pathname = href.split(/[?#]/)[0] ?? href;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return false;
  if (pathname === "/") return path === "/";
  return path === pathname || path.startsWith(`${pathname}/`);
}

/** The phone list stays in this order, whatever the desktop bar does. */
const PHONE_ORDER = ["/about", "/books", "/blog", "/videos", "/gallery", "/foundation", "/contact"];

function phoneRank(href: string): number {
  const path = href.split(/[?#]/)[0] ?? href;
  const rank = PHONE_ORDER.indexOf(path);
  return rank === -1 ? PHONE_ORDER.length : rank;
}

/**
 * Desktop only. Explore opens a sheet under the bar. The phone menu flattens
 * the same links back into the list it had before.
 */
function NavMenu({ item }: { item: NavItem }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const group = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const here = item.children.some((child) => isHere(child.href, path));

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onOutside = (event: Event) => {
      if (!group.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [open]);

  const apart = item.children.length > 1 ? item.children[item.children.length - 1] : null;
  const places = apart ? item.children.slice(0, -1) : item.children;
  const lineFor = (href: string) => {
    const path = href.split(/[?#]/)[0] ?? href;
    const lines: Record<string, string> = {
      "/books": t.site.explore.books,
      "/blog": t.site.explore.stories,
      "/videos": t.site.explore.videos,
      "/gallery": t.site.explore.gallery,
      "/foundation": t.site.explore.foundation,
    };
    return lines[path] ?? "";
  };
  const apartLine = apart ? lineFor(apart.href) : "";

  return (
    <li className="nav-group" ref={group}>
      <button
        ref={button}
        className="nav-group-btn"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-current={here ? "true" : undefined}
        lang={item.labelLang}
        onClick={() => setOpen((value) => !value)}
      >
        {item.label}
        <Icon name={open ? "chev-up" : "chev-down"} className="i i-16" />
      </button>
      <div className="nav-mega" id={panelId} hidden={!open}>
        <div className="wrap">
          <ul className="nav-mega-grid">
            {places.map((child, index) => {
              const line = lineFor(child.href);
              return (
                <li key={child.id}>
                  <SiteLink href={child.href} lang={child.labelLang} markCurrent>
                    <span className="mega-kicker" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="mega-title">{child.label}</span>
                    {line && (
                      <span className="mega-line" lang={locale}>
                        {line}
                      </span>
                    )}
                  </SiteLink>
                </li>
              );
            })}
          </ul>
          {apart && (
            <div className="nav-mega-apart">
              <SiteLink href={apart.href} lang={apart.labelLang} markCurrent arrow>
                <span className="mega-copy">
                  <span className="mega-title">{apart.label}</span>
                  {apartLine && (
                    <span className="mega-line" lang={locale}>
                      {apartLine}
                    </span>
                  )}
                </span>
              </SiteLink>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** The phone list: groups open out into their links, in the same order. */
function phoneItems(items: NavItem[]): NavItem[] {
  const leaves = items.flatMap((item) =>
    item.children.length > 0
      ? item.children.filter((child) => child.href)
      : item.href
        ? [item]
        : [],
  );
  return leaves
    .map((item, index) => ({ item, index }))
    .sort((a, b) => phoneRank(a.item.href) - phoneRank(b.item.href) || a.index - b.index)
    .map(({ item }) => item);
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

  const phone = phoneItems(items);
  const panel = (
    <div className="wrap">
      {phone.length > 0 && (
        <nav aria-label={t.site.primaryNav}>
          <ul>
            {phone.map((item) => (
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
              {items.map((item) =>
                item.children.length > 0 ? (
                  <NavMenu key={item.id} item={item} />
                ) : (
                  item.href && (
                    <li key={item.id}>
                      <SiteLink href={item.href} lang={item.labelLang} markCurrent>
                        {item.label}
                      </SiteLink>
                    </li>
                  )
                ),
              )}
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
