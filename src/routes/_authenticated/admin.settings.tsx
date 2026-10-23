import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/site/Icon";
import { errorText, savedWords } from "@/components/studio/format";
import { useAnnounce, useNow } from "@/components/studio/hooks";
import {
  AreaField,
  ConfirmDialog,
  Field,
  FormAlert,
  Loading,
  PageHead,
  SelectField,
  Switch,
  TextField,
} from "@/components/studio/kit";
import { MediaField } from "@/components/studio/MediaPicker";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { disconnectKeys, getKeys, saveKeys } from "@/lib/settings.functions";
import type { ProviderState, SettingsProvider } from "@/server/studio-settings.server";

/**
 * Keys and links: the site's details, the third-party keys (Stripe, YouTube,
 * Resend, Turnstile) sealed by the server, and the social links. A saved key
 * is never shown again: only "Set" and its last four characters.
 */
export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Keys and links — Studio" }] }),
  component: Settings,
});

function Settings() {
  return (
    <>
      <PageHead
        title="Keys and links"
        lead="The site's details, the services it connects to, and your social links. Keys are stored encrypted; once saved, only their last four characters are shown."
      />
      <SiteDetails />
      <Keys />
      <SocialLinks />
    </>
  );
}

function Card({
  id,
  title,
  status,
  children,
}: {
  id: string;
  title: string;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="set-card" aria-labelledby={id} id={`${id}-card`}>
      <div className="set-head">
        <h2 className="title" id={id}>
          {title}
        </h2>
        {status}
      </div>
      {children}
    </section>
  );
}

function SaveLine({
  busy,
  dirty,
  savedAt,
  label = "Save",
  children,
}: {
  busy: boolean;
  dirty: boolean;
  savedAt: number | null;
  label?: string;
  children?: ReactNode;
}) {
  const now = useNow();
  return (
    <div className="mgr-save">
      <span className="meta" role="status">
        {busy ? "Saving…" : dirty ? "Unsaved changes" : savedWords(savedAt, now)}
      </span>
      {children}
      <button
        className="btn btn-quiet"
        type="submit"
        disabled={busy || !dirty}
        aria-busy={busy || undefined}
      >
        {label}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Site details
// ---------------------------------------------------------------------------

type SiteRow = Database["public"]["Tables"]["site_settings"]["Row"];
const SITE_TEXT: { key: keyof SiteRow; label: string; long?: boolean; hint?: string }[] = [
  { key: "site_name", label: "Site name" },
  { key: "tagline", label: "Tagline" },
  { key: "contact_email", label: "Contact email", hint: "Where contact messages are sent." },
  { key: "footer_text", label: "Footer text", long: true },
  { key: "default_seo_title", label: "Search title" },
  {
    key: "default_seo_description",
    label: "Search description",
    long: true,
    hint: "Shown by search engines for pages without their own.",
  },
  { key: "legal_name", label: "Legal name" },
  { key: "legal_address", label: "Legal address", long: true },
  { key: "company_number", label: "Company number" },
  { key: "vat_number", label: "VAT number" },
  { key: "charity_number", label: "Charity number" },
];

function SiteDetails() {
  const [row, setRow] = useState<SiteRow | null>(null);
  const [draft, setDraft] = useState<Partial<SiteRow>>({});
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", "site")
      .maybeSingle()
      .then(({ data, error: e }) => (e ? setError(errorText(e)) : setRow(data)));
  }, []);

  if (!row) return error ? <FormAlert>{error}</FormAlert> : <Loading>Loading…</Loading>;
  const value = { ...row, ...draft };
  const dirty = Object.keys(draft).length > 0;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from("site_settings")
        .update({ ...draft, updated_at: new Date().toISOString() })
        .eq("id", "site")
        .select("*")
        .single();
      if (e || !data) throw e ?? new Error("The details didn't save.");
      setRow(data);
      setDraft({});
      setSavedAt(Date.now());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="site" title="Site details">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="mgr-pair">
          {SITE_TEXT.map((f) =>
            f.long ? (
              <AreaField
                key={f.key}
                label={f.label}
                hint={f.hint}
                rows={3}
                value={String(value[f.key] ?? "")}
                onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
              />
            ) : (
              <TextField
                key={f.key}
                label={f.label}
                hint={f.hint}
                type={f.key === "contact_email" ? "email" : "text"}
                value={String(value[f.key] ?? "")}
                onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
              />
            ),
          )}
        </div>
        <MediaField
          label="Social card image"
          hint="Shown when a page is shared, unless the page has its own. 1200 × 630 works best."
          kind="image"
          value={value.social_image_id}
          onChange={(id) => setDraft((d) => ({ ...d, social_image_id: id }))}
        />
        <p className="meta">The Greek tagline, footer and search text are in Greek translations.</p>
        {error && <FormAlert>{error}</FormAlert>}
        <SaveLine busy={busy} dirty={dirty} savedAt={savedAt} />
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

type KeyField = { key: string; label: string; hint?: string };
type ConfigField = KeyField & { kind?: "switch" };

const PROVIDERS: {
  provider: SettingsProvider;
  title: string;
  lead: string;
  secrets: KeyField[];
  config: ConfigField[];
}[] = [
  {
    provider: "stripe",
    title: "Payments (Stripe)",
    lead: "Book formats and shop items sold here check out with Stripe. Without a key, buy buttons link to the retailers instead.",
    secrets: [
      {
        key: "secretKey",
        label: "Secret key",
        hint: "From Stripe: Developers → API keys. Starts with sk_live_ (or sk_test_ to try it out).",
      },
      {
        key: "webhookSecret",
        label: "Webhook signing secret",
        hint: "From the webhook endpoint for the address below. Starts with whsec_.",
      },
    ],
    config: [
      {
        key: "shipping_countries",
        label: "Ships to",
        hint: "Two-letter country codes separated by commas, such as CY,GR,GB. Empty uses the EU, the UK and the US.",
      },
      {
        key: "shipping_rate",
        label: "Shipping rate",
        hint: "A Stripe shipping rate id (shr_…) added to orders that ship. Optional.",
      },
      { key: "automatic_tax", label: "Stripe works out tax", kind: "switch" },
    ],
  },
  {
    provider: "youtube",
    title: "Videos (YouTube)",
    lead: "Lets the site read your channel's newest videos.",
    secrets: [
      { key: "apiKey", label: "API key", hint: "A Google Cloud key with YouTube Data API access." },
    ],
    config: [
      {
        key: "channel_id",
        label: "Channel id",
        hint: "Starts with UC. In YouTube: Settings → Advanced settings.",
      },
    ],
  },
  {
    provider: "resend",
    title: "Email (Resend)",
    lead: "Sends confirmations, download links and receipts.",
    secrets: [{ key: "apiKey", label: "API key", hint: "From Resend: API keys. Starts with re_." }],
    config: [
      {
        key: "from",
        label: "Sender",
        hint: "Name and address on a domain verified in Resend, such as Anastasia Patience <letters@yourdomain.com>.",
      },
      { key: "replyTo", label: "Replies go to", hint: "Optional." },
    ],
  },
  {
    provider: "turnstile",
    title: "Spam protection (Turnstile)",
    lead: "Cloudflare Turnstile checks the site's forms for bots, without puzzles.",
    secrets: [{ key: "secretKey", label: "Secret key" }],
    config: [{ key: "site_key", label: "Site key", hint: "Public; shown on each form." }],
  },
];

function Keys() {
  const [states, setStates] = useState<ProviderState[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getKeys().then(setStates, (e: unknown) => setError(errorText(e)));
  }, []);
  if (error) return <FormAlert>{error}</FormAlert>;
  if (!states) return <Loading>Loading the keys…</Loading>;
  return (
    <>
      {PROVIDERS.map((p) => {
        const state = states.find((s) => s.provider === p.provider);
        return state ? (
          <ProviderCard
            key={p.provider}
            spec={p}
            state={state}
            onChange={(next) =>
              setStates(
                (list) => list?.map((s) => (s.provider === next.provider ? next : s)) ?? null,
              )
            }
          />
        ) : null;
      })}
    </>
  );
}

function ProviderCard({
  spec,
  state,
  onChange,
}: {
  spec: (typeof PROVIDERS)[number];
  state: ProviderState;
  onChange: (state: ProviderState) => void;
}) {
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [announce, say] = useAnnounce();
  const value = (key: string) => config[key] ?? state.config[key] ?? "";
  const dirty =
    Object.values(secrets).some((v) => v.trim()) ||
    Object.entries(config).some(([k, v]) => v !== (state.config[k] ?? ""));
  const connected = state.status === "connected";
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const next = await saveKeys({ data: { provider: spec.provider, secrets, config } });
      onChange(next);
      setSecrets({});
      setConfig({});
      setSavedAt(Date.now());
      say(`${spec.title} saved.`);
    } catch (e) {
      setError(errorText(e, "The keys didn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      id={`keys-${spec.provider}`}
      title={spec.title}
      status={
        <span className={connected ? "badge badge--approved" : "badge badge--quiet"}>
          <Icon name={connected ? "check" : "minus"} />
          {connected ? "Connected" : "Not connected"}
        </span>
      }
    >
      {announce}
      <p className="meta">{spec.lead}</p>
      <form
        className="form"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {spec.secrets.map((f) => {
          const s = state.secrets[f.key];
          return (
            <SecretInput
              key={f.key}
              label={f.label}
              hint={f.hint}
              state={s}
              value={secrets[f.key] ?? ""}
              onChange={(v) => setSecrets((all) => ({ ...all, [f.key]: v }))}
            />
          );
        })}
        {spec.provider === "stripe" && (
          <Field
            label="Webhook address"
            hint="Add this endpoint in Stripe and send it the checkout.session events (completed, expired, async_payment_succeeded and async_payment_failed) and charge.refunded."
          >
            {(p) => <input {...p} readOnly value={`${origin}/api/stripe/webhook`} />}
          </Field>
        )}
        {spec.config.map((f) =>
          f.kind === "switch" ? (
            <Switch
              key={f.key}
              label={f.label}
              checked={value(f.key) === "true"}
              onChange={(on) => setConfig((c) => ({ ...c, [f.key]: String(on) }))}
            />
          ) : (
            <TextField
              key={f.key}
              label={f.label}
              hint={f.hint}
              value={value(f.key)}
              spellCheck={false}
              onChange={(v) => setConfig((c) => ({ ...c, [f.key]: v }))}
            />
          ),
        )}
        {error && <FormAlert>{error}</FormAlert>}
        <SaveLine busy={busy} dirty={dirty} savedAt={savedAt} label="Save keys">
          {connected && (
            <button
              className="btn-text btn-danger"
              type="button"
              aria-haspopup="dialog"
              onClick={() => setRemoving(true)}
            >
              Disconnect
            </button>
          )}
        </SaveLine>
      </form>
      <ConfirmDialog
        open={removing}
        title={`Disconnect ${spec.title}?`}
        body="The saved keys are removed. The settings stay, so connecting again only needs the keys."
        confirm="Disconnect"
        onConfirm={async () => {
          await disconnectKeys({ data: { provider: spec.provider } });
          const fresh = await getKeys();
          const next = fresh.find((s) => s.provider === spec.provider);
          if (next) onChange(next);
          say(`${spec.title} disconnected.`);
        }}
        onClose={() => setRemoving(false)}
      />
    </Card>
  );
}

/** A secret is typed, never shown back: the field starts empty and says whether one is saved. */
function SecretInput({
  label,
  hint,
  state,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  state: { set: boolean; last4: string } | undefined;
  value: string;
  onChange: (value: string) => void;
}) {
  const set = state?.set;
  return (
    <TextField
      label={label}
      hint={
        <>
          {set ? "Saved. Type a new one only to replace it." : "Not set yet."}
          {hint ? ` ${hint}` : ""}
        </>
      }
      aside={
        set ? (
          <span className="set-secret meta">
            <Icon name="lock" />
            Set · ends in <code>{state?.last4 || "····"}</code>
          </span>
        ) : (
          <span className="meta">Not set</span>
        )
      }
      type="password"
      autoComplete="new-password"
      spellCheck={false}
      value={value}
      onChange={onChange}
    />
  );
}

// ---------------------------------------------------------------------------
// Social links
// ---------------------------------------------------------------------------

type Social = Database["public"]["Tables"]["social_links"]["Row"];
const PLATFORMS = [
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["x", "X"],
  ["linkedin", "LinkedIn"],
  ["threads", "Threads"],
  ["spotify", "Spotify"],
  ["email", "Email"],
  ["website", "Website"],
].map(([value, label]) => ({ value, label }));
const platformName = (p: string) => PLATFORMS.find((x) => x.value === p)?.label ?? p;

function SocialLinks() {
  const [rows, setRows] = useState<Social[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Social | null>(null);
  const [announce, say] = useAnnounce();
  const headingId = useId();

  async function load() {
    const { data, error: e } = await supabase.from("social_links").select("*").order("position");
    if (e) setError(errorText(e));
    else setRows(data);
  }
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    setError(null);
    const { data, error: e } = await supabase
      .from("social_links")
      .insert({
        platform: "instagram",
        url: "https://instagram.com/",
        label: "",
        position: (rows?.length ?? 0) + 1,
        enabled: false,
      })
      .select("*")
      .single();
    if (e || !data) return setError(errorText(e));
    setRows((list) => [...(list ?? []), data]);
    say("Link added, hidden until you switch it on.");
  }

  async function move(index: number, to: number) {
    if (!rows || to < 0 || to >= rows.length) return;
    const next = rows.slice();
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    setRows(next);
    await Promise.all(
      next.map((r, i) =>
        supabase
          .from("social_links")
          .update({ position: i + 1 })
          .eq("id", r.id),
      ),
    );
    say(`${platformName(item.platform)} moved to position ${to + 1} of ${next.length}.`);
  }

  return (
    <section className="set-card" aria-labelledby={headingId}>
      {announce}
      <div className="set-head">
        <h2 className="title" id={headingId}>
          Social links
        </h2>
        <button className="btn btn-quiet btn-sm" type="button" onClick={add}>
          <Icon name="plus" />
          Add a link
        </button>
      </div>
      <p className="meta">Shown in the footer and on the link page, in this order.</p>
      {error && <FormAlert>{error}</FormAlert>}
      {!rows ? (
        <Loading>Loading links…</Loading>
      ) : rows.length === 0 ? (
        <p className="meta">No links yet. Add your first one.</p>
      ) : (
        <ul className="socials">
          {rows.map((row, i) => (
            <SocialRow
              key={row.id}
              row={row}
              index={i}
              count={rows.length}
              onMove={(to) => move(i, to)}
              onSaved={(next) =>
                setRows((list) => list?.map((r) => (r.id === next.id ? next : r)) ?? null)
              }
              onRemove={() => setRemoving(row)}
            />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!removing}
        title={`Remove ${removing ? platformName(removing.platform) : "this link"}?`}
        body="It disappears from the footer and the link page straight away."
        confirm="Remove link"
        onConfirm={async () => {
          if (!removing) return;
          const { error: e } = await supabase.from("social_links").delete().eq("id", removing.id);
          if (e) throw e;
          setRows((list) => list?.filter((r) => r.id !== removing.id) ?? null);
          say(`${platformName(removing.platform)} removed.`);
        }}
        onClose={() => setRemoving(null)}
      />
    </section>
  );
}

function SocialRow({
  row,
  index,
  count,
  onMove,
  onSaved,
  onRemove,
}: {
  row: Social;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onSaved: (row: Social) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState({ platform: row.platform, url: row.url, label: row.label });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty =
    draft.platform !== row.platform || draft.url !== row.url || draft.label !== row.label;
  const name = platformName(row.platform);

  async function save(patch: Partial<Social>) {
    setBusy(true);
    setError(null);
    try {
      if (patch.url !== undefined && !/^(https:\/\/\S+|mailto:\S+@\S+)$/.test(patch.url))
        throw new Error("Use a full https:// address, or mailto: for email.");
      const { data, error: e } = await supabase
        .from("social_links")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .select("*")
        .single();
      if (e || !data) throw e ?? new Error("The link didn't save.");
      onSaved(data);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="social">
      <SelectField
        label="Platform"
        value={draft.platform}
        options={PLATFORMS}
        onChange={(v) => setDraft((d) => ({ ...d, platform: v }))}
      />
      <TextField
        label="Address"
        type="url"
        value={draft.url}
        spellCheck={false}
        error={error}
        onChange={(v) => setDraft((d) => ({ ...d, url: v.trim() }))}
      />
      <TextField
        label="Label"
        hint="Optional, such as @anastasiapatience."
        value={draft.label}
        onChange={(v) => setDraft((d) => ({ ...d, label: v }))}
      />
      <div className="social-tools">
        <Switch
          label={`Show ${name}`}
          checked={row.enabled}
          onChange={(on) => save({ enabled: on })}
        />
        <button
          className="icon-btn"
          type="button"
          aria-label={`Move ${name} up`}
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
        >
          <Icon name="arrow-up" />
        </button>
        <button
          className="icon-btn"
          type="button"
          aria-label={`Move ${name} down`}
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
        >
          <Icon name="arrow-down" />
        </button>
        <button
          className="icon-btn icon-btn--danger"
          type="button"
          aria-label={`Remove ${name}`}
          aria-haspopup="dialog"
          onClick={onRemove}
        >
          <Icon name="trash" />
        </button>
        <button
          className="btn btn-quiet btn-sm"
          type="button"
          disabled={!dirty || busy}
          aria-busy={busy || undefined}
          onClick={() => save(draft)}
        >
          Save<span className="sr-only"> {name}</span>
        </button>
      </div>
    </li>
  );
}
