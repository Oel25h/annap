import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { day, errorText } from "@/components/studio/format";
import { FormAlert, Loading, PageHead } from "@/components/studio/kit";
import { supabase } from "@/integrations/supabase/client";
import { listGreekQueue } from "@/lib/translations.functions";

/**
 * The studio's first screen: what needs attention (unread messages, Greek
 * to write), how much is on the site, and the latest messages and sign-ups.
 */
export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Overview — Studio" }] }),
  component: Overview,
});

type Card = { label: string; value: number; to: string };
type Recent = {
  messages: { id: string; name: string; enquiry_type: string; created_at: string; read: boolean }[];
  subs: { id: string; email: string; source: string | null; created_at: string }[];
};

const count = (t: "pages" | "books" | "blog_posts" | "products" | "audiobooks" | "events") =>
  supabase.from(t).select("id", { count: "exact", head: true });

function Overview() {
  const [attention, setAttention] = useState<Card[] | null>(null);
  const [site, setSite] = useState<Card[] | null>(null);
  const [recent, setRecent] = useState<Recent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [pages, books, posts, products, audiobooks, events, unread, subs, sent, m, s] =
        await Promise.all([
          count("pages"),
          count("books"),
          count("blog_posts"),
          count("products"),
          count("audiobooks"),
          count("events"),
          supabase
            .from("contact_messages")
            .select("id", { count: "exact", head: true })
            .eq("read", false)
            .is("archived_at", null),
          supabase
            .from("subscribers")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),
          supabase
            .from("newsletters")
            .select("id", { count: "exact", head: true })
            .eq("status", "sent"),
          supabase
            .from("contact_messages")
            .select("id, name, enquiry_type, created_at, read")
            .is("archived_at", null)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("subscribers")
            .select("id, email, source, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);
      if (!live) return;
      const failed = [
        pages,
        books,
        posts,
        products,
        audiobooks,
        events,
        unread,
        subs,
        sent,
        m,
        s,
      ].find((r) => r.error);
      if (failed) setError(errorText(failed.error));
      setSite([
        { label: "Pages", value: pages.count ?? 0, to: "/admin/pages" },
        { label: "Books", value: books.count ?? 0, to: "/admin/books" },
        { label: "Audiobooks", value: audiobooks.count ?? 0, to: "/admin/audiobooks" },
        { label: "Stories", value: posts.count ?? 0, to: "/admin/blog" },
        { label: "Shop items", value: products.count ?? 0, to: "/admin/products" },
        { label: "Events", value: events.count ?? 0, to: "/admin/events" },
        { label: "Subscribers", value: subs.count ?? 0, to: "/admin/subscribers" },
        { label: "Letters sent", value: sent.count ?? 0, to: "/admin/newsletter" },
      ]);
      setRecent({
        messages: (m.data ?? []) as Recent["messages"],
        subs: (s.data ?? []) as Recent["subs"],
      });
      let greek = 0;
      try {
        const queue = await listGreekQueue();
        greek = queue.filter((q) => q.status === "stale" || q.status === "missing").length;
      } catch {
        greek = -1;
      }
      if (!live) return;
      setAttention([
        { label: "Unread messages", value: unread.count ?? 0, to: "/admin/messages" },
        { label: "Greek to write or update", value: greek, to: "/admin/translations" },
      ]);
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <PageHead
        title="Your studio"
        lead="Changes to pages wait for Publish; everything else goes live when you save."
        actions={
          <a className="btn btn-quiet" href="/" target="_blank" rel="noreferrer">
            <Icon name="arrow-ext" />
            View the site
          </a>
        }
      />
      {error && <FormAlert>{error}</FormAlert>}

      <section className="ov-section" aria-labelledby="ov-attention">
        <h2 className="title" id="ov-attention">
          Needs you
        </h2>
        {!attention ? <Loading>Checking…</Loading> : <Cards cards={attention} />}
      </section>

      <section className="ov-section" aria-labelledby="ov-site">
        <h2 className="title" id="ov-site">
          On the site
        </h2>
        {!site ? <Loading>Counting…</Loading> : <Cards cards={site} />}
      </section>

      {recent && (
        <div className="ov-section ov-recent">
          <section aria-labelledby="ov-messages">
            <div className="kids-head">
              <h2 className="title" id="ov-messages">
                Latest messages
              </h2>
              <Link className="btn-text" to="/admin/messages">
                All messages
              </Link>
            </div>
            {recent.messages.length === 0 ? (
              <p className="meta">No messages yet.</p>
            ) : (
              <ul className="mgr-list">
                {recent.messages.map((m) => (
                  <li key={m.id} className={m.read ? "msg" : "msg is-unread"}>
                    <div className="msg-head">
                      <span className="msg-from">{m.name}</span>
                      <span className="meta">
                        {m.enquiry_type.charAt(0).toUpperCase() + m.enquiry_type.slice(1)} ·{" "}
                        {day(m.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="ov-subs">
            <div className="kids-head">
              <h2 className="title" id="ov-subs">
                Latest sign-ups
              </h2>
              <Link className="btn-text" to="/admin/subscribers">
                All subscribers
              </Link>
            </div>
            {recent.subs.length === 0 ? (
              <p className="meta">No sign-ups yet.</p>
            ) : (
              <ul className="mgr-list">
                {recent.subs.map((s) => (
                  <li key={s.id} className="msg">
                    <div className="msg-head">
                      <span>{s.email}</span>
                      <span className="meta">
                        {s.source ?? "unknown"} · {day(s.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Cards({ cards }: { cards: Card[] }) {
  return (
    <ul className="ov-grid">
      {cards.map((c) => (
        <li key={c.label}>
          <Link className="ov-card" to={c.to}>
            <span className="meta">{c.label}</span>
            <b>{c.value < 0 ? "—" : c.value}</b>
          </Link>
        </li>
      ))}
    </ul>
  );
}
