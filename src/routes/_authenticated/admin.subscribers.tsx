import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Icon } from "@/components/site/Icon";
import { day, errorText } from "@/components/studio/format";
import { useAnnounce } from "@/components/studio/hooks";
import {
  ConfirmDialog,
  Empty,
  FormAlert,
  Loading,
  Modal,
  PageHead,
  SelectField,
  Switch,
  TextField,
} from "@/components/studio/kit";
import { supabase } from "@/integrations/supabase/client";

/**
 * Everyone on the letters list: sign-ups over the last 90 days, where they
 * came from, search, a CSV of what is shown, adding someone by hand (only
 * with their consent), and removal.
 */
export const Route = createFileRoute("/_authenticated/admin/subscribers")({
  head: () => ({ meta: [{ title: "Subscribers — Studio" }] }),
  component: Subscribers,
});

type Sub = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  status: string;
  locale: string;
  created_at: string;
};

const STATUS_WORD: Record<string, string> = {
  active: "Subscribed",
  pending: "Awaiting confirmation",
  unsubscribed: "Unsubscribed",
};

function Subscribers() {
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Sub | null>(null);
  const [announce, say] = useAnnounce();
  const searchId = useId();

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("subscribers")
      .select("id, email, name, source, status, locale, created_at")
      .order("created_at", { ascending: false });
    if (e) setError(errorText(e));
    else setSubs((data ?? []) as Sub[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of subs ?? [])
      counts.set(s.source ?? "unknown", (counts.get(s.source ?? "unknown") ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [subs]);

  const shown = useMemo(() => {
    const words = q.trim().toLowerCase();
    return (subs ?? []).filter(
      (s) =>
        (source === "all" || (s.source ?? "unknown") === source) &&
        (status === "all" || s.status === status) &&
        (!words || `${s.email} ${s.name ?? ""}`.toLowerCase().includes(words)),
    );
  }, [subs, q, source, status]);

  function exportCsv() {
    const rows = [
      ["email", "name", "source", "status", "language", "signed_up"],
      ...shown.map((s) => [
        s.email,
        s.name ?? "",
        s.source ?? "",
        s.status,
        s.locale,
        s.created_at,
      ]),
    ];
    // A leading = + - @ would run as a formula in a spreadsheet; quote it out.
    const cell = (c: string) => `"${(/^[=+\-@]/.test(c) ? `'${c}` : c).replace(/"/g, '""')}"`;
    const csv = rows.map((r) => r.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    say(`Exported ${shown.length} subscribers.`);
  }

  const active = (subs ?? []).filter((s) => s.status === "active").length;

  return (
    <>
      {announce}
      <PageHead
        title="Subscribers"
        lead={
          subs ? `${active} subscribed · ${subs.length} in all` : "Everyone on the letters list."
        }
        actions={
          <>
            <button className="btn btn-quiet" type="button" onClick={() => setAdding(true)}>
              <Icon name="plus" />
              Add by hand
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={exportCsv}
              disabled={!shown.length}
            >
              <Icon name="arrow-down" />
              Export CSV
            </button>
          </>
        }
      />
      {error && <FormAlert>{error}</FormAlert>}
      {!subs ? (
        <Loading>Loading subscribers…</Loading>
      ) : (
        <>
          <section className="ov-section" aria-labelledby="signups">
            <h2 className="title" id="signups">
              Sign-ups over the last 90 days
            </h2>
            <SignupChart subs={subs} />
          </section>

          <section className="ov-section" aria-labelledby="where">
            <h2 className="title" id="where">
              Where they came from
            </h2>
            {sources.length === 0 ? (
              <p className="meta">No sign-ups yet.</p>
            ) : (
              <ul className="ov-grid">
                {sources.map(([name, n]) => (
                  <li key={name}>
                    <button
                      className="ov-card sub-source"
                      type="button"
                      aria-pressed={source === name}
                      onClick={() => setSource((s) => (s === name ? "all" : name))}
                    >
                      <span className="meta">{name}</span>
                      <b>{n}</b>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ov-section" aria-labelledby="people">
            <h2 className="title" id="people">
              People
            </h2>
            <div className="mgr-tools">
              <SelectField
                label="Source"
                value={source}
                onChange={setSource}
                options={[
                  { value: "all", label: "Every source" },
                  ...sources.map(([name]) => ({ value: name, label: name })),
                ]}
              />
              <SelectField
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "Any status" },
                  ...Object.entries(STATUS_WORD).map(([value, label]) => ({ value, label })),
                ]}
              />
              <div className="field mgr-search">
                <label htmlFor={searchId}>Search email or name</label>
                <input
                  id={searchId}
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
            {shown.length === 0 ? (
              <Empty>No subscribers match.</Empty>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Email</th>
                      <th scope="col">Name</th>
                      <th scope="col">Source</th>
                      <th scope="col">Status</th>
                      <th scope="col">Joined</th>
                      <th scope="col">
                        <span className="sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((s) => (
                      <tr key={s.id}>
                        <td>{s.email}</td>
                        <td>{s.name ?? "—"}</td>
                        <td>{s.source ?? "unknown"}</td>
                        <td>{STATUS_WORD[s.status] ?? s.status}</td>
                        <td>{day(s.created_at)}</td>
                        <td>
                          <button
                            className="icon-btn icon-btn--danger"
                            type="button"
                            aria-label={`Remove ${s.email}`}
                            onClick={() => setRemoving(s)}
                          >
                            <Icon name="trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <AddSubscriber
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(s) => {
          setSubs((list) => [s, ...(list ?? [])]);
          say(`${s.email} added.`);
        }}
      />
      <ConfirmDialog
        open={!!removing}
        title={`Remove ${removing?.email ?? ""}?`}
        body="They stop getting letters and their record is deleted. This can't be undone."
        confirm="Remove subscriber"
        onConfirm={async () => {
          if (!removing) return;
          const { error: e } = await supabase.from("subscribers").delete().eq("id", removing.id);
          if (e) throw new Error(errorText(e));
          setSubs((list) => list?.filter((x) => x.id !== removing.id) ?? null);
          say(`${removing.email} removed.`);
        }}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

/** One bar per day; the busiest day sets the height. */
function SignupChart({ subs }: { subs: Sub[] }) {
  const days = useMemo(() => {
    const out: { date: string; count: number }[] = [];
    const today = new Date();
    const index = new Map<string, number>();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      index.set(key, out.length);
      out.push({ date: key, count: 0 });
    }
    for (const s of subs) {
      const at = index.get(s.created_at.slice(0, 10));
      if (at !== undefined) out[at].count++;
    }
    return out;
  }, [subs]);
  const total = days.reduce((n, d) => n + d.count, 0);
  const peak = Math.max(1, ...days.map((d) => d.count));
  const best = days.reduce((a, b) => (b.count > a.count ? b : a), days[0]);
  const summary =
    total === 0
      ? "No sign-ups in the last 90 days."
      : `${total} sign-ups in the last 90 days; the most in one day was ${best.count}, on ${day(best.date)}.`;
  return (
    <figure className="sub-chart">
      <svg viewBox="0 0 900 160" preserveAspectRatio="none" role="img" aria-label={summary}>
        <line className="sub-chart-base" x1="0" y1="159.5" x2="900" y2="159.5" />
        {days.map((d, i) =>
          d.count ? (
            <rect
              key={d.date}
              x={i * 10 + 1}
              width="8"
              y={160 - (d.count / peak) * 150}
              height={(d.count / peak) * 150}
            >
              <title>{`${day(d.date)}: ${d.count}`}</title>
            </rect>
          ) : null,
        )}
      </svg>
      <figcaption className="meta">
        <span>{day(days[0].date)}</span>
        <span>{summary}</span>
        <span>Today</span>
      </figcaption>
    </figure>
  );
}

function AddSubscriber({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (s: Sub) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState("manual");
  const [locale, setLocale] = useState("en");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setName("");
    setSource("manual");
    setConsent(false);
    setError(null);
  }, [open]);

  async function add() {
    setError(null);
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError("Enter an email address.");
    if (!consent) return setError("Only add someone who has asked to get the letters.");
    setBusy(true);
    const { data, error: e } = await supabase
      .from("subscribers")
      .insert({
        email: address,
        name: name.trim() || null,
        source: source.trim() || "manual",
        locale,
        status: "active",
        consent_source: "studio",
        confirmed_at: new Date().toISOString(),
      })
      .select("id, email, name, source, status, locale, created_at")
      .single();
    setBusy(false);
    if (e || !data)
      return setError(
        e?.code === "23505"
          ? "That address is already on the list."
          : errorText(e, "They weren't added."),
      );
    onAdded(data as Sub);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a subscriber">
      <div className="mgr-form">
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="off"
        />
        <TextField label="Name" hint="Optional." value={name} onChange={setName} />
        <TextField
          label="Source"
          hint="A word for where you met, such as a reading."
          value={source}
          onChange={setSource}
        />
        <SelectField
          label="Letters in"
          value={locale}
          onChange={setLocale}
          options={[
            { value: "en", label: "English" },
            { value: "el", label: "Greek" },
          ]}
        />
        <Switch label="They asked to get the letters" checked={consent} onChange={setConsent} />
        {error && <FormAlert>{error}</FormAlert>}
      </div>
      <div className="confirm-actions">
        <button className="btn btn-quiet" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" type="button" onClick={add} disabled={busy}>
          {busy ? "Adding…" : "Add subscriber"}
        </button>
      </div>
    </Modal>
  );
}
