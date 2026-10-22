import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  ShoppingBag,
  GraduationCap,
  Mail,
  Users,
  LogOut,
  Menu,
  X,
  Send,
  FileEdit,
  ExternalLink,
  Link2,
  BookOpen,
  Share2,
  HeartHandshake,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/start", label: "Start page", icon: Link2 },
  { to: "/admin/socials", label: "Socials", icon: Share2 },
  { to: "/admin/blog", label: "Blog", icon: FileText },
  { to: "/admin/books", label: "Books", icon: BookOpen },
  { to: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { to: "/admin/foundation", label: "Foundation", icon: HeartHandshake },
  { to: "/admin/products", label: "Shop", icon: ShoppingBag },
  { to: "/admin/masterclass", label: "Masterclass", icon: GraduationCap },
  { to: "/admin/pages", label: "Page content", icon: FileEdit },
  { to: "/admin/messages", label: "Messages", icon: Mail },
  { to: "/admin/subscribers", label: "Community", icon: Users },
  { to: "/admin/newsletter", label: "Newsletter", icon: Send },
] as const;

function AdminLayout() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  // Lock body scroll while mobile drawer is open + close on Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="admin-shell min-h-screen bg-[#e8dccf] text-plum">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-plum/15 bg-[#e8dccf]/95 backdrop-blur px-4 py-2.5 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="grid h-11 w-11 -ml-2 place-items-center rounded-full text-plum"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/admin" className="font-display text-xl text-plum">
          Studio<span className="text-burgundy">.</span>
        </Link>
        <Link
          to="/"
          className="grid h-11 w-11 -mr-2 place-items-center rounded-full text-plum/80"
          aria-label="View public site"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="md:grid md:grid-cols-[280px_1fr]">
        {/* Mobile drawer backdrop */}
        {open && (
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-plum/50 backdrop-blur-sm md:hidden"
          />
        )}

        {/* Sidebar — deeper warm surface */}
        <aside
          className={[
            "border-r border-plum/15 bg-[#d9c8b4]",
            "fixed inset-y-0 left-0 z-50 w-[86%] max-w-sm overflow-y-auto transition-transform duration-300 ease-out md:static md:z-auto md:w-auto md:max-w-none md:min-h-screen md:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4 md:hidden">
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="font-display text-2xl leading-none text-plum"
            >
              Studio<span className="text-burgundy">.</span>
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-full border border-plum/20 bg-[#efe6db] text-plum"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="hidden px-7 pt-10 pb-6 md:block">
            <Link to="/admin" className="font-display text-3xl leading-none text-plum">
              Studio<span className="text-burgundy">.</span>
            </Link>
            <div className="mt-2 text-[10px] uppercase tracking-[0.32em] text-plum/70">
              Anastasia · Command centre
            </div>
          </div>
          <nav className="flex flex-col gap-0.5 px-3 pb-8 md:px-4 md:pb-10">
            {NAV.map((n) => {
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: (n as { exact?: boolean }).exact }}
                  activeProps={{
                    className:
                      "bg-[#efe6db] text-plum font-semibold border-l-[3px] border-burgundy pl-[17px] shadow-sm",
                  }}
                  className="flex items-center gap-3 rounded-lg border-l-[3px] border-transparent px-5 py-3 text-sm font-medium text-plum/85 transition hover:bg-[#efe6db]/80 hover:text-plum"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{n.label}</span>
                </Link>
              );
            })}

            <div className="mt-8 border-t border-plum/15 pt-4">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-5 py-2.5 text-xs font-medium text-plum/75 transition hover:bg-[#efe6db]/80 hover:text-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy/25"
              >
                ← View public site
              </Link>
              <button
                onClick={signOut}
                className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-5 py-2.5 text-xs font-medium text-plum/75 transition hover:bg-[#efe6db]/80 hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy/25"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-col px-4 py-6 md:px-10 md:py-12">
          <div className="mx-auto w-full min-w-0 max-w-6xl flex-1">
            <Outlet />
          </div>

          <footer className="mx-auto mt-12 w-full max-w-6xl border-t border-plum/15 pt-5 pb-2">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs font-medium text-plum/70">
              <div>© {new Date().getFullYear()} Anastasia Patience · Studio</div>
              <Link to="/" className="inline-flex items-center gap-1.5 hover:text-plum">
                <ExternalLink className="h-3 w-3" /> View public site
              </Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
