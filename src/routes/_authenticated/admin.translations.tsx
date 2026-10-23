import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { GreekEditor, type QueueItem } from "@/components/studio/GreekPanel";
import { BackLink, Empty, FormAlert, Loading, PageHead, Segmented } from "@/components/studio/kit";
import { GreekBadge } from "@/components/studio/parts";
import { listGreekQueue } from "@/lib/translations.functions";
import { errorText } from "@/components/studio/format";

/**
 * The Greek translations queue (DESIGN.md §11): everything with English the
 * site shows in Greek, stale and missing first. Open an item to see the
 * English, the Greek that is live, Was / Now for stale items, and to write
 * the draft. Approve is a person's explicit, confirmed action; nothing is
 * machine-translated or approved on its own.
 */
export const Route = createFileRoute("/_authenticated/admin/translations")({
  head: () => ({ meta: [{ title: "Greek translations — Studio" }] }),
  validateSearch: (s: Record<string, unknown>): { item?: string; show?: string } => ({
    item: typeof s.item === "string" ? s.item : undefined,
    show: typeof s.show === "string" ? s.show : undefined,
  }),
  component: Queue,
});

const ORDER: Record<QueueItem["status"], number> = { stale: 0, missing: 1, draft: 2, approved: 3 };
const SHOW = [
  { value: "todo", label: "To do" },
  { value: "stale", label: "Stale" },
  { value: "missing", label: "Missing" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
];

const keyOf = (i: Pick<QueueItem, "entityType" | "entityId">) => `${i.entityType}:${i.entityId}`;

function Queue() {
  const { item, show = "todo" } = Route.useSearch();
  const nav = useNavigate({ from: "/admin/translations" });
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const searchId = useId();

  useEffect(() => {
    listGreekQueue().then(setItems, (e: unknown) => setError(errorText(e)));
  }, []);

  const counts = useMemo(() => {
    const c = { stale: 0, missing: 0, draft: 0, approved: 0 };
    for (const i of items ?? []) c[i.status]++;
    return c;
  }, [items]);

  if (error)
    return (
      <>
        <PageHead title="Greek translations" />
        <FormAlert>{error} Reload the page to try again.</FormAlert>
      </>
    );
  if (!items) return <Loading>Loading the Greek…</Loading>;

  const open = item ? items.find((i) => keyOf(i) === item) : undefined;
  if (item)
    return (
      <>
        <PageHead
          back={<BackLink onClick={() => nav({ search: { show } })}>All translations</BackLink>}
          title={open?.title || open?.group || "Translation"}
          lead={
            open && (
              <>
                {open.group}
                {open.editHref && (
                  <>
                    {" · "}
                    <a className="link" href={open.editHref}>
                      Edit the English
                    </a>
                  </>
                )}
              </>
            )
          }
        />
        {open ? (
          <div className="tq-detail">
            <GreekEditor
              item={open}
              onChanged={(next) =>
                setItems((list) => list?.map((i) => (keyOf(i) === keyOf(next) ? next : i)) ?? null)
              }
            />
          </div>
        ) : (
          <Empty>This item has no English to translate any more.</Empty>
        )}
      </>
    );

  const needle = q.trim().toLowerCase();
  const shown = items
    .filter((i) => (show === "todo" ? i.status !== "approved" : i.status === show))
    .filter((i) => !needle || `${i.title} ${i.group}`.toLowerCase().includes(needle))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.title.localeCompare(b.title));
  const groups = new Map<string, QueueItem[]>();
  for (const i of shown) groups.set(i.group, [...(groups.get(i.group) ?? []), i]);
  const total = items.length;

  return (
    <div className="tq">
      <PageHead
        title="Greek translations"
        lead={
          <>
            Greek{" "}
            <b>
              {counts.approved}/{total}
            </b>{" "}
            approved. English is the source; each Greek text goes live on /el only when you approve
            it.
          </>
        }
      />
      <div className="tq-counts" role="group" aria-label="Greek status">
        {(["stale", "missing", "draft"] as const).map((s) => (
          <GreekBadge
            key={s}
            status={s}
            count={counts[s]}
            onClick={() => nav({ search: { show: s } })}
          />
        ))}
        <GreekBadge status="approved" count={counts.approved} />
      </div>
      <div className="mgr-tools">
        <Segmented
          legend="Show"
          value={show}
          onChange={(v) => nav({ search: { show: v } })}
          options={SHOW}
        />
        <div className="field mgr-search">
          <label htmlFor={searchId}>Search</label>
          <input id={searchId} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {shown.length === 0 ? (
        <Empty>
          {show === "todo"
            ? "Every Greek text is approved and up to date."
            : "Nothing here. Choose another status above."}
        </Empty>
      ) : (
        [...groups].map(([group, list]) => (
          <section className="tq-group" key={group} aria-labelledby={`tq-${group}`}>
            <h2 className="title" id={`tq-${group}`}>
              {group}
            </h2>
            <ul className="mgr-list">
              {list.map((i) => (
                <li key={keyOf(i)}>
                  <Link
                    className="mgr-row mgr-row--plain"
                    to="/admin/translations"
                    search={{ item: keyOf(i), show }}
                  >
                    <span className="mgr-row-text">
                      <span className="mgr-row-name">{i.title || i.group}</span>
                      <span className="mgr-row-meta meta">
                        {i.fields.length} {i.fields.length === 1 ? "field" : "fields"}
                        {i.status === "stale" && i.fields.some((f) => f.was !== null)
                          ? " · English changed"
                          : ""}
                      </span>
                    </span>
                    <span className="mgr-row-end">
                      <GreekBadge status={i.status} />
                      <Icon name="chev-right" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
