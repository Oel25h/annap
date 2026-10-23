import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

/** The managers, in the order the owner reaches for them. */
const NAV: { group: string; items: { to: string; label: string; exact?: boolean }[] }[] = [
  {
    group: "Site",
    items: [
      { to: "/admin", label: "Overview", exact: true },
      { to: "/admin/pages", label: "Pages" },
      { to: "/admin/media", label: "Media" },
      { to: "/admin/translations", label: "Greek translations" },
    ],
  },
  {
    group: "Writing and work",
    items: [
      { to: "/admin/books", label: "Books" },
      { to: "/admin/audiobooks", label: "Audiobooks" },
      { to: "/admin/blog", label: "Stories" },
      { to: "/admin/products", label: "Shop" },
      { to: "/admin/masterclass", label: "Masterclasses" },
      { to: "/admin/events", label: "Events" },
      { to: "/admin/press", label: "Press" },
      { to: "/admin/gallery", label: "Gallery" },
      { to: "/admin/foundation", label: "Foundation stories" },
      { to: "/admin/testimonials", label: "Praise" },
    ],
  },
  {
    group: "People",
    items: [
      { to: "/admin/messages", label: "Messages" },
      { to: "/admin/subscribers", label: "Subscribers" },
      { to: "/admin/newsletter", label: "Newsletter" },
    ],
  },
  {
    group: "Settings",
    items: [{ to: "/admin/settings", label: "Keys and links" }],
  },
];

/** The page builder fills the window with its own bar and panes. */
const BUILDER = /^\/admin\/pages\/[^/]+\/?$/;

function current(pathname: string) {
  const items = NAV.flatMap((g) => g.items);
  return (
    items.find((i) => i.exact && pathname === i.to) ??
    items
      .filter((i) => !i.exact && (pathname === i.to || pathname.startsWith(`${i.to}/`)))
      .sort((a, b) => b.to.length - a.to.length)[0]
  );
}

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (BUILDER.test(pathname)) return <Outlet />;
  return <Shell pathname={pathname} />;
}

function Shell({ pathname }: { pathname: string }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const here = current(pathname);

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  // The menu sheet closes on Escape and after a choice, and gives focus back.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  function close() {
    setOpen(false);
    requestAnimationFrame(() => menuRef.current?.focus());
  }

  return (
    <div className="studio-app shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="shell-bar header-glass" inert={open}>
        <button
          ref={menuRef}
          className="icon-btn shell-menu"
          type="button"
          aria-label="Studio menu"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" />
        </button>
        <Link className="wordmark shell-wide" to="/admin" activeOptions={{ exact: true }}>
          Anastasia Patience
        </Link>
        <span className="vr shell-wide" aria-hidden="true" />
        <nav className="crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              {here?.to === "/admin" ? (
                <span aria-current="page">Studio</span>
              ) : (
                <Link to="/admin" activeOptions={{ exact: true }}>
                  Studio
                </Link>
              )}
            </li>
            {here && here.to !== "/admin" && <li aria-current="page">{here.label}</li>}
          </ol>
        </nav>
        <div className="shell-bar-end">
          <a className="btn-text shell-wide" href="/" target="_blank" rel="noopener">
            View site
            <span className="sr-only"> (opens a new tab)</span>
          </a>
          <button className="btn-text" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <nav
        className={open ? "shell-nav is-open" : "shell-nav"}
        aria-label="Studio"
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
      >
        <div className="shell-nav-head">
          <p className="title">Studio</p>
          <button className="icon-btn" type="button" aria-label="Close menu" onClick={close}>
            <Icon name="close" />
          </button>
        </div>
        {NAV.map((group) => (
          <div key={group.group}>
            <h2 className="label">{group.group}</h2>
            <ul>
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: !!item.exact, includeSearch: false }}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <main className="shell-main" id="main" tabIndex={-1} inert={open}>
        <div className="shell-main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
