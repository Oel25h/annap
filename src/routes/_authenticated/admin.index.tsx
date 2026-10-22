import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  ShoppingBag,
  Mail,
  Users,
  Send,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PillButton, Chip } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

type Recent = {
  messages: { id: string; name: string; enquiry_type: string; created_at: string; read: boolean }[];
  subs: { id: string; email: string; source: string | null; created_at: string }[];
};

function Dashboard() {
  const [stats, setStats] = useState({
    posts: 0,
    images: 0,
    products: 0,
    unread: 0,
    subs: 0,
    sent: 0,
  });
  const [recent, setRecent] = useState<Recent>({ messages: [], subs: [] });

  useEffect(() => {
    (async () => {
      const [posts, images, products, unread, subs, sent, m, s] = await Promise.all([
        supabase.from("blog_posts").select("*", { count: "exact", head: true }),
        supabase.from("gallery_images").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase
          .from("contact_messages")
          .select("*", { count: "exact", head: true })
          .eq("read", false),
        supabase
          .from("subscribers")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("newsletters")
          .select("*", { count: "exact", head: true })
          .eq("status", "sent"),
        supabase
          .from("contact_messages")
          .select("id,name,enquiry_type,created_at,read")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("subscribers")
          .select("id,email,source,created_at")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      setStats({
        posts: posts.count ?? 0,
        images: images.count ?? 0,
        products: products.count ?? 0,
        unread: unread.count ?? 0,
        subs: subs.count ?? 0,
        sent: sent.count ?? 0,
      });
      setRecent({
        messages: (m.data ?? []) as Recent["messages"],
        subs: (s.data ?? []) as Recent["subs"],
      });
    })();
  }, []);

  const cards = [
    {
      label: "Blog posts",
      value: stats.posts,
      icon: FileText,
      to: "/admin/blog",
      accent: "text-burgundy bg-burgundy/10",
    },
    {
      label: "Gallery photos",
      value: stats.images,
      icon: ImageIcon,
      to: "/admin/gallery",
      accent: "text-plum bg-gold/30",
    },
    {
      label: "Shop items",
      value: stats.products,
      icon: ShoppingBag,
      to: "/admin/products",
      accent: "text-plum bg-plum/8",
    },
    {
      label: "Community",
      value: stats.subs,
      icon: Users,
      to: "/admin/subscribers",
      accent: "text-burgundy bg-burgundy/10",
    },
    {
      label: "Unread messages",
      value: stats.unread,
      icon: Mail,
      to: "/admin/messages",
      accent: "text-plum bg-gold/30",
    },
    {
      label: "Newsletters sent",
      value: stats.sent,
      icon: Send,
      to: "/admin/newsletter",
      accent: "text-plum bg-plum/8",
    },
  ];

  const shortcuts = [
    { label: "New blog post", to: "/admin/blog?new=1" },
    { label: "Upload photos", to: "/admin/gallery" },
    { label: "Add product", to: "/admin/products?new=1" },
    { label: "New newsletter", to: "/admin/newsletter?new=1" },
  ];

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-plum/8 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-plum/70">
            <Sparkles className="h-3 w-3" /> Welcome back
          </div>
          <h1 className="mt-3 font-display text-3xl leading-[1.05] text-plum sm:text-4xl md:text-5xl">
            Your studio
          </h1>
          <p className="mt-2 max-w-md text-sm text-ink">
            Everything you publish here goes live on your site instantly.
          </p>
        </div>
        <Link to="/" className="hidden md:block">
          <PillButton variant="outline">
            View public site <ArrowRight className="h-3.5 w-3.5" />
          </PillButton>
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              to={c.to}
              className="group relative overflow-hidden rounded-2xl border border-plum/10 bg-ivory p-5 transition hover:border-plum/25 sm:p-6"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.28em] text-plum/60">
                  {c.label}
                </span>
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${c.accent}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-5 font-display text-4xl leading-none text-plum sm:mt-6 sm:text-5xl">
                {c.value}
              </div>
              <div className="mt-5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-plum/50 group-hover:text-burgundy sm:mt-6">
                Open <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </section>

      <section>
        <h2 className="font-display text-2xl text-plum">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {shortcuts.map((s) => (
            <Link
              key={s.to}
              to={s.to.split("?")[0]}
              search={s.to.includes("?") ? { new: "1" } : undefined}
            >
              <PillButton>
                {s.label} <ArrowRight className="h-3.5 w-3.5" />
              </PillButton>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-plum/10 bg-bone/50 p-6 soft-shadow">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-plum">Latest messages</h3>
            <Link
              to="/admin/messages"
              className="text-[10px] uppercase tracking-[0.22em] text-burgundy hover:underline"
            >
              View all →
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {recent.messages.length === 0 && (
              <li className="text-sm text-plum/50">No messages yet.</li>
            )}
            {recent.messages.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-ivory px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-plum">{m.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-plum/50">
                    {m.enquiry_type} · {new Date(m.created_at).toLocaleDateString()}
                  </div>
                </div>
                {!m.read && <Chip tone="coral">New</Chip>}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-plum/10 bg-bone/50 p-6 soft-shadow">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-plum">New subscribers</h3>
            <Link
              to="/admin/subscribers"
              className="text-[10px] uppercase tracking-[0.22em] text-burgundy hover:underline"
            >
              View all →
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {recent.subs.length === 0 && (
              <li className="text-sm text-plum/50">No subscribers yet.</li>
            )}
            {recent.subs.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-ivory px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-plum">{s.email}</div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-plum/50">
                    via {s.source ?? "unknown"} · {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
