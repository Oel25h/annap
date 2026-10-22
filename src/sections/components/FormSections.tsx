import { caps } from "@/lib/i18n/caps";
import { useId, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { field, Honeypot, useFormAction } from "@/components/forms/useFormAction";
import { Icon } from "@/components/site/Icon";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { SiteLink } from "@/components/site/SiteLink";
import { useLocale, useT } from "@/lib/i18n/context";
import { fmt, formatMoney } from "@/lib/i18n/format";
import { sendContactMessage, type ContactTopic } from "@/lib/forms.functions";
import { startDonation } from "@/lib/payments.functions";
import type { MediaMap, RenderedSection } from "@/sections/types";
import { keyLang, SectionShell, type SectionContext } from "../render/SectionShell";

type Props<T extends RenderedSection["type"]> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

function FormError({ message }: { message: string | null }) {
  return (
    <p className="form-status" role="status" aria-live="polite">
      {message && (
        <span className="field-error">
          <Icon name="alert" />
          {message}
        </span>
      )}
    </p>
  );
}

export function Newsletter({ section, ctx }: Props<"newsletter">) {
  const p = section.props;
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      className={`signup-section signup-section--${section.variant}`}
      runhead={{ title: "" }}
    >
      <div className="signup">
        <div>
          {p.eyebrow && <p className="label label--accent">{caps(p.eyebrow)}</p>}
          <h2 id={ctx.headingId} className="display-m" lang={keyLang(section, "title")}>
            {p.title}
          </h2>
          {p.body && (
            <p className="body" lang={keyLang(section, "body")}>
              {p.body}
            </p>
          )}
        </div>
        <NewsletterForm source="section" />
      </div>
    </SectionShell>
  );
}

const TOPICS: ContactTopic[] = ["general", "speaking", "media", "partnerships"];

export function ContactForm({ section, ctx }: Props<"contact_form">) {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const p = section.props;
  const { state, sending, formProps, turnstileSlot } = useFormAction((data, turnstile) =>
    sendContactMessage({
      data: {
        name: field(data, "name"),
        email: field(data, "email"),
        topic: (TOPICS.find((topic) => topic === field(data, "topic")) ??
          "general") as ContactTopic,
        message: field(data, "message"),
        locale,
        website: field(data, "website"),
        turnstile,
      },
    }),
  );
  const c = t.sections.contact;

  return (
    <SectionShell section={section} ctx={ctx} labelled={!!p.title} label={p.eyebrow || c.send}>
      <div className="contact">
        {(p.title || p.body) && (
          <div className="contact-copy">
            {p.title && (
              <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
                {p.title}
              </h2>
            )}
            {p.body && (
              <p className="lead" lang={keyLang(section, "body")}>
                {p.body}
              </p>
            )}
          </div>
        )}
        {state.step === "done" ? (
          <div className="form-done" role="status">
            <Icon name="check" />
            <p className="title">{c.doneTitle}</p>
            <p className="body">{c.doneBody}</p>
          </div>
        ) : (
          <form className="form" {...formProps}>
            <div className="fields fields--two">
              <div className="field">
                <label htmlFor={`${id}-name`}>{c.name}</label>
                <input id={`${id}-name`} name="name" autoComplete="name" required maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor={`${id}-email`}>{c.email}</label>
                <input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t.site.footer.emailPlaceholder}
                  required
                  maxLength={320}
                />
              </div>
            </div>
            <fieldset className="field choice">
              <legend>{c.topic}</legend>
              <div className="chips">
                {TOPICS.map((topic, index) => (
                  <label key={topic} className="chip">
                    <input type="radio" name="topic" value={topic} defaultChecked={index === 0} />
                    <span>{c.topics[topic]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor={`${id}-message`}>{c.message}</label>
              <textarea id={`${id}-message`} name="message" rows={6} required maxLength={5000} />
            </div>
            <Honeypot />
            {turnstileSlot}
            <div className="form-foot">
              <button
                className="btn btn-primary"
                type="submit"
                aria-disabled={sending || undefined}
              >
                {sending ? t.sections.forms.sending : c.send}
              </button>
              <p className="fine">
                <Icon name="lock" />
                <span>{c.privacy}</span>
                <SiteLink href="/privacy">{t.site.footer.privacy}</SiteLink>
              </p>
            </div>
            <FormError message={state.step === "error" ? state.message : null} />
          </form>
        )}
      </div>
    </SectionShell>
  );
}

/** Giving: once or monthly, preset amounts or another, then Stripe Checkout. */
export function Donation({ section, ctx }: Props<"donation">) {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const p = section.props;
  const d = t.sections.donation;
  const payments = section.data?.payments ?? false;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cancelled = useRouterState({
    select: (s) =>
      (s.location.search as Record<string, unknown>).cancelled === 1 ||
      (s.location.search as Record<string, unknown>).cancelled === "1",
  });
  const [interval, setInterval] = useState<"one_off" | "month">("one_off");
  const [preset, setPreset] = useState<number | "other">(p.amounts[1] ?? p.amounts[0]);
  const [other, setOther] = useState("");
  const euros = preset === "other" ? Number(other.replace(",", ".")) : preset;
  const valid = Number.isFinite(euros) && euros >= 1 && euros <= 10_000;
  const amountText = valid ? formatMoney(Math.round(euros * 100), "EUR", locale) : "";

  const { state, sending, formProps, turnstileSlot } = useFormAction(
    async (_data, turnstile) => {
      if (!valid) return { ok: false as const, error: "range" };
      const result = await startDonation({
        data: {
          amountCents: Math.round(euros * 100),
          interval,
          locale,
          returnPath: pathname.replace(/^\/el(?=\/|$)/, "") || "/",
          turnstile,
        },
      });
      if (result.ok) window.location.assign(result.url);
      return result;
    },
    {
      range: fmt(d.range, {
        min: formatMoney(100, "EUR", locale),
        max: formatMoney(1_000_000, "EUR", locale),
      }),
      unavailable: d.unavailable,
    },
  );

  return (
    <SectionShell
      section={section}
      ctx={ctx}
      className={`give give--${section.variant}`}
      runhead={{ title: "" }}
    >
      <div className="give-grid">
        <div className="give-copy">
          {p.eyebrow && <p className="label label--accent">{caps(p.eyebrow)}</p>}
          <h2 id={ctx.headingId} className="display-l" lang={keyLang(section, "title")}>
            {p.title}
          </h2>
          {p.body && (
            <p className="lead" lang={keyLang(section, "body")}>
              {p.body}
            </p>
          )}
        </div>
        {!payments ? (
          <div className="give-card">
            <p className="body">{d.unavailable}</p>
            <p>
              <SiteLink className="btn btn-quiet" href="/contact">
                {d.contact}
                <Icon name="arrow-right" />
              </SiteLink>
            </p>
          </div>
        ) : (
          <form className="give-card" {...formProps}>
            {cancelled && <p className="note meta">{d.cancelled}</p>}
            {p.allowMonthly && (
              <fieldset className="segmented">
                <legend className="sr-only">{d.frequency}</legend>
                {(["one_off", "month"] as const).map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="interval"
                      value={value}
                      checked={interval === value}
                      onChange={() => setInterval(value)}
                    />
                    <span>{value === "one_off" ? d.once : d.monthly}</span>
                  </label>
                ))}
              </fieldset>
            )}
            <fieldset className="amounts">
              <legend className="label">{caps(d.amount)}</legend>
              {p.amounts.map((amount) => (
                <label key={amount} className="chip chip--amount">
                  <input
                    type="radio"
                    name="amount"
                    value={amount}
                    checked={preset === amount}
                    onChange={() => setPreset(amount)}
                  />
                  <span>{formatMoney(amount * 100, "EUR", locale)}</span>
                </label>
              ))}
              <label className="chip chip--amount">
                <input
                  type="radio"
                  name="amount"
                  value="other"
                  checked={preset === "other"}
                  onChange={() => setPreset("other")}
                />
                <span>{d.other}</span>
              </label>
            </fieldset>
            {preset === "other" && (
              <div className="field">
                <label htmlFor={`${id}-other`}>{d.otherLabel}</label>
                <input
                  id={`${id}-other`}
                  inputMode="decimal"
                  autoComplete="off"
                  value={other}
                  onChange={(event) => setOther(event.target.value)}
                  aria-invalid={other !== "" && !valid ? true : undefined}
                />
              </div>
            )}
            {turnstileSlot}
            <button
              className="btn btn-primary btn-block"
              type="submit"
              aria-disabled={sending || !valid || undefined}
            >
              <Icon name="heart" />
              <span>
                {sending
                  ? t.sections.forms.sending
                  : fmt(interval === "month" ? d.giveMonthly : d.give, {
                      amount: amountText || "…",
                    })}
              </span>
            </button>
            <p className="fine">
              <Icon name="lock" />
              <span>{d.secure}</span>
            </p>
            <FormError message={state.step === "error" ? state.message : null} />
          </form>
        )}
      </div>
    </SectionShell>
  );
}
