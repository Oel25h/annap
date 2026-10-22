import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search, UserPlus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  PillButton,
  Field,
  inputCls,
  cardCls,
  ConfirmButton,
  EmptyState,
  Chip,
} from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/subscribers")({
  component: Subs,
});

type Sub = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  status: string;
  created_at: string;
};

function Subs() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addSource, setAddSource] = useState("manual");

  async function load() {
    const { data } = await supabase
      .from("subscribers")
      .select("*")
      .order("created_at", { ascending: false });
    setSubs((data ?? []) as Sub[]);
  }
  useEffect(() => {
    load();
  }, []);

  const sources = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of subs) m.set(s.source ?? "unknown", (m.get(s.source ?? "unknown") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [subs]);

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    for (const s of subs) {
      const key = s.created_at.slice(0, 10);
      if (key in days) days[key]++;
    }
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [subs]);

  const filtered = useMemo(() => {
    return subs.filter(
      (s) =>
        (filter === "all" || (s.source ?? "unknown") === filter) &&
        (q === "" ||
          s.email.toLowerCase().includes(q.toLowerCase()) ||
          (s.name ?? "").toLowerCase().includes(q.toLowerCase())),
    );
  }, [subs, q, filter]);

  async function del(id: string) {
    await supabase.from("subscribers").delete().eq("id", id);
    await load();
  }

  async function manualAdd() {
    if (!addEmail) return;
    await supabase
      .from("subscribers")
      .insert({ email: addEmail, name: addName || null, source: addSource || "manual" });
    setAddEmail("");
    setAddName("");
    setShowAdd(false);
    await load();
  }

  function exportCsv() {
    const rows = [
      ["email", "name", "source", "status", "signed_up"],
      ...filtered.map((s) => [s.email, s.name ?? "", s.source ?? "", s.status, s.created_at]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-plum md:text-5xl">Community</h1>
          <p className="mt-2 text-sm text-ink">
            {subs.filter((s) => s.status === "active").length} active · {subs.length} total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PillButton variant="outline" onClick={() => setShowAdd((v) => !v)}>
            <UserPlus className="h-4 w-4" /> Add manually
          </PillButton>
          <PillButton onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> Export CSV
          </PillButton>
        </div>
      </div>

      {showAdd && (
        <section className={cardCls + " grid gap-4 sm:grid-cols-4"}>
          <Field label="Email">
            <input
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className={inputCls}
              type="email"
            />
          </Field>
          <Field label="Name (optional)">
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Source tag">
            <input
              value={addSource}
              onChange={(e) => setAddSource(e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="flex items-end">
            <PillButton onClick={manualAdd}>Add subscriber</PillButton>
          </div>
        </section>
      )}

      <section className={cardCls}>
        <h2 className="font-display text-xl text-plum">Signups over the last 90 days</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,26,26,0.08)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "rgba(26,26,26,0.5)" }}
                tickFormatter={(d) => d.slice(5)}
                interval={14}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "rgba(26,26,26,0.5)" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(26,26,26,0.1)" }}
              />
              <Line type="monotone" dataKey="count" stroke="#e85d3a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-plum">Where they came from</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map(([src, n]) => (
            <button
              key={src}
              onClick={() => setFilter(src)}
              className={`rounded-3xl border p-5 text-left transition ${filter === src ? "border-burgundy bg-burgundy/8" : "border-plum/10 bg-bone/50"}`}
            >
              <div className="text-[10px] uppercase tracking-[0.28em] text-plum/50">Source</div>
              <div className="mt-1 truncate font-display text-lg text-plum">{src}</div>
              <div className="mt-3 font-display text-3xl text-burgundy">{n}</div>
            </button>
          ))}
          {sources.length === 0 && <p className="text-sm text-plum/50">No sign-ups yet.</p>}
        </div>
        {filter !== "all" && (
          <div className="mt-3">
            <button
              onClick={() => setFilter("all")}
              className="text-xs uppercase tracking-[0.22em] text-burgundy hover:underline"
            >
              ← Clear source filter
            </button>
          </div>
        )}
      </section>

      <section className={cardCls}>
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-plum/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email or name…"
            className="flex-1 bg-transparent text-plum focus:outline-none"
          />
        </div>
      </section>

      <div className="overflow-x-auto rounded-3xl border border-plum/10 bg-bone/50">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-plum/5 text-[10px] uppercase tracking-[0.22em] text-plum/60">
            <tr>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-plum/10">
                <td className="px-5 py-3 text-plum">{s.email}</td>
                <td className="px-5 py-3 text-plum/60">{s.name ?? "—"}</td>
                <td className="px-5 py-3">
                  <Chip>{s.source ?? "unknown"}</Chip>
                </td>
                <td className="px-5 py-3">
                  <Chip tone={s.status === "active" ? "success" : "warn"}>{s.status}</Chip>
                </td>
                <td className="px-5 py-3 text-plum/60">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <ConfirmButton onConfirm={() => del(s.id)} message="Remove this subscriber?">
                    Remove
                  </ConfirmButton>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-plum/50">
                  No subscribers match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
