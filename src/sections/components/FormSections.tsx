import { useId, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { EMAIL, field, Honeypot, useFormAction } from "@/components/forms/useFormAction";
import { Icon } from "@/components/site/Icon";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { SiteLink } from "@/components/site/SiteLink";
import { useLocale, useT } from "@/lib/i18n/context";
import { fmt, formatMoney } from "@/lib/i18n/format";
import { nb } from "@/lib/i18n/rag";
import { sendContactMessage, type ContactTopic } from "@/lib/forms.functions";
import { startDonation } from "@/lib/payments.functions";
import type { MediaMap, RenderedSection } from "@/sections/types";
import { keyLang, SectionHeading, SectionShell, type SectionContext } from "../render/SectionShell";

type Props<T extends RenderedSection["type"]> = {
  section: RenderedSection<T>;
  media: MediaMap;
  ctx: SectionContext;
};

/** A heading inside the section's own layout: one level under the section heading. */
const subHeading = (ctx: SectionContext, titled: boolean) =>
  ctx.headingLevel === "h1" || !titled ? "h2" : "h3";

/**
 * Letters sign-up as its own section, laid out like the footer's: the heading
 * and line on 1–6, the form on 7–12, aligned to the bottom.
 */
export function Newsletter({ section, ctx }: Props<"newsletter">) {
  const p = section.props;
  return (
    <SectionShell
      section={section}
      ctx={ctx}
      labelled
      className={`newsletter newsletter--${section.variant}`}
    >
      <div className="grid-12 newsletter-grid">
        <div className="newsletter-copy">
          <SectionHeading ctx={ctx} lang={keyLang(section, "title")}>
            {p.title}
          </SectionHeading>
          {p.body && (
            <p className="body" lang={keyLang(section, "body")}>
              {nb(p.body)}
            </p>
          )}
        </div>
        <div className="newsletter-form">
          <NewsletterForm
            source="section"
            labelledBy={ctx.headingId}
            headingLevel={subHeading(ctx, true)}
          />
        </div>
      </div>
    </SectionShell>
  );
}

const TOPICS: ContactTopic[] = ["general", "speaking", "media", "partnerships"];

/**
 * Write to Anastasia: the heading and line on 1–5, the form on 7–12. The
 * same pattern as the free eBook form: a hint naming what's needed, labels
 * above, errors on submit and then on blur, and success in place.
 */
export function ContactForm({ section, ctx }: Props<"contact_form">) {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const p = section.props;
  const c = t.sections.contact;
  const [sender, setSender] = useState("");
  const form = useFormAction(
    (data, turnstile) => {
      setSender(field(data, "name").trim().split(/\s+/)[0] ?? "");
      return sendContactMessage({
        data: {
          name: field(data, "name"),
          email: field(data, "email"),
          topic: TOPICS.find((topic) => topic === field(data, "topic")) ?? "general",
          message: field(data, "message"),
          locale,
          website: field(data, "website"),
          turnstile,
        },
      });
    },
    {},
    {
      checks: {
        name: (value) => !value.trim() && c.nameMissing,
        email: (value) => !EMAIL.test(value.trim()) && t.sections.forms.emailInvalid,
        message: (value) => !value.trim() && c.messageMissing,
      },
    },
  );
  const titled = !!p.title;
  const Sub = subHeading(ctx, titled);
  const hintId = `${id}-hint`;
  const doneTitle = sender ? fmt(c.doneTitleName, { name: sender }) : c.doneTitle;

  return (
    <SectionShell section={section} ctx={ctx} labelled={titled} className="contact">
      <div className="grid-12 contact-grid">
        {(p.title || p.body) && (
          <div className="contact-copy">
            {p.title && (
              <SectionHeading ctx={ctx} lang={keyLang(section, "title")}>
                {p.title}
              </SectionHeading>
            )}
            {p.body && (
              <p className="lead" lang={keyLang(section, "body")}>
                {nb(p.body)}
              </p>
            )}
          </div>
        )}
        <div className="contact-form">
          {form.state.step === "done" ? (
            <div className="form-done">
              <Sub ref={form.doneRef} className="display-m" tabIndex={-1}>
                {doneTitle}
              </Sub>
              <p className="body">{c.doneBody}</p>
            </div>
          ) : (
            <form
              className="form-stack"
              noValidate
              aria-labelledby={titled ? ctx.headingId : undefined}
              {...form.formProps}
            >
              <p id={hintId} className="form-hint">
                {c.hint}
              </p>
              <div className="fields fields--name-email">
                <div className="field">
                  <label htmlFor={`${id}-name`}>{c.name}</label>
                  <input
                    id={`${id}-name`}
                    autoComplete="name"
                    required
                    maxLength={120}
                    {...form.fieldProps("name", hintId)}
                  />
                  {form.fieldError("name")}
                </div>
                <div className="field">
                  <label htmlFor={`${id}-email`}>{c.email}</label>
                  <input
                    id={`${id}-email`}
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={320}
                    {...form.fieldProps("email", hintId)}
                  />
                  {form.fieldError("email")}
                </div>
              </div>
              <fieldset className="field-set">
                <legend className="field-label">{c.topic}</legend>
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
                <textarea
                  id={`${id}-message`}
                  rows={6}
                  required
                  maxLength={5000}
                  {...form.fieldProps("message", hintId)}
                />
                {form.fieldError("message")}
              </div>
              <Honeypot />
              {form.turnstileSlot}
              {form.alertSlot}
              <button className="btn btn-primary btn-block" {...form.submitProps}>
                {form.sending ? c.sending : c.send}
              </button>
              <p className="fine">
                <span className="fine-note">
                  <Icon name="lock" />
                  <span>{c.privacy}</span>
                </span>
                <SiteLink href="/privacy">{t.site.footer.privacy}</SiteLink>
              </p>
            </form>
          )}
          {form.statusSlot(`${doneTitle} ${c.doneBody}`)}
        </div>
      </div>
    </SectionShell>
  );
}

/** Euros typed by hand: a comma or a point for the decimals. */
const euros = (value: string) => Number(value.trim().replace(",", "."));
const inRange = (amount: number) => Number.isFinite(amount) && amount >= 1 && amount <= 10_000;

/**
 * Giving: the heading and line on 1–5, the card on 7–12. Once or monthly,
 * a preset amount or another, then Stripe Checkout. Without payments set up,
 * the card says so and offers a way to get in touch.
 */
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
  const [frequency, setFrequency] = useState<"one_off" | "month">("one_off");
  const [preset, setPreset] = useState<number | "other">(p.amounts[1] ?? p.amounts[0]);
  const [other, setOther] = useState("");
  const amount = preset === "other" ? euros(other) : preset;
  const amountText = inRange(amount) ? formatMoney(Math.round(amount * 100), "EUR", locale) : "";
  const limits = {
    min: formatMoney(100, "EUR", locale),
    max: formatMoney(1_000_000, "EUR", locale),
  };
  const range = fmt(d.range, limits);

  const form = useFormAction(
    async (data, turnstile) => {
      const chosen = field(data, "amount");
      const result = await startDonation({
        data: {
          amountCents: Math.round(
            (chosen === "other" ? euros(field(data, "other")) : Number(chosen)) * 100,
          ),
          interval: field(data, "interval") === "month" ? "month" : "one_off",
          locale,
          returnPath: pathname.replace(/^\/el(?=\/|$)/, "") || "/",
          turnstile,
        },
      });
      if (result.ok) window.location.assign(result.url);
      return result;
    },
    { invalid: range, unavailable: d.unavailable },
    {
      checks: {
        other: (value, data) =>
          field(data, "amount") === "other" && !inRange(euros(value)) && range,
      },
      // Never on to Stripe unasked.
      retryOnReconnect: false,
    },
  );
  // On its way to Stripe: the button keeps waiting until the page changes.
  const busy = form.sending || form.state.step === "done";
  const label = amountText
    ? fmt(frequency === "month" ? d.donateMonthly : d.donateAmount, { amount: amountText })
    : d.donate;

  return (
    <SectionShell section={section} ctx={ctx} labelled className={`give give--${section.variant}`}>
      <div className="grid-12 give-grid">
        <div className="give-copy">
          <SectionHeading ctx={ctx} lang={keyLang(section, "title")}>
            {p.title}
          </SectionHeading>
          {p.body && (
            <p className="lead" lang={keyLang(section, "body")}>
              {nb(p.body)}
            </p>
          )}
        </div>
        {!payments ? (
          <div className="give-card give-card--off">
            <p className="body">{d.unavailable}</p>
            <SiteLink className="btn btn-quiet" href="/contact">
              {d.contact}
              <Icon name="arrow-right" />
            </SiteLink>
          </div>
        ) : (
          <form
            className="give-card form-stack"
            noValidate
            aria-labelledby={ctx.headingId}
            {...form.formProps}
          >
            {cancelled && <p className="form-hint">{d.cancelled}</p>}
            {p.allowMonthly && (
              <fieldset className="segmented">
                <legend className="sr-only">{d.frequency}</legend>
                {(["one_off", "month"] as const).map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="interval"
                      value={value}
                      checked={frequency === value}
                      onChange={() => setFrequency(value)}
                    />
                    <span>{value === "one_off" ? d.once : d.monthly}</span>
                  </label>
                ))}
              </fieldset>
            )}
            <fieldset className="field-set">
              <legend className="field-label">{d.amount}</legend>
              <div className="chips give-amounts">
                {p.amounts.map((value) => (
                  <label key={value} className="chip">
                    <input
                      type="radio"
                      name="amount"
                      value={value}
                      checked={preset === value}
                      onChange={() => setPreset(value)}
                    />
                    <span>{formatMoney(value * 100, "EUR", locale)}</span>
                  </label>
                ))}
                <label className="chip">
                  <input
                    type="radio"
                    name="amount"
                    value="other"
                    checked={preset === "other"}
                    onChange={() => setPreset("other")}
                  />
                  <span>{d.other}</span>
                </label>
              </div>
            </fieldset>
            {preset === "other" && (
              <div className="field give-other">
                <label htmlFor={`${id}-other`}>{d.otherLabel}</label>
                <input
                  id={`${id}-other`}
                  inputMode="decimal"
                  autoComplete="off"
                  value={other}
                  onChange={(event) => setOther(event.target.value)}
                  {...form.fieldProps("other", `${id}-other-hint`)}
                />
                <p id={`${id}-other-hint`} className="field-hint">
                  {fmt(d.otherHint, limits)}
                </p>
                {form.fieldError("other")}
              </div>
            )}
            {form.turnstileSlot}
            {form.alertSlot}
            <button
              className="btn btn-primary btn-block"
              {...form.submitProps}
              disabled={busy}
              aria-busy={busy || undefined}
            >
              {!busy && <Icon name="heart" />}
              <span>{busy ? d.redirecting : label}</span>
            </button>
            <p className="fine">
              <span className="fine-note">
                <Icon name="lock" />
                <span>{d.secure}</span>
              </span>
            </p>
            {form.statusSlot(d.redirecting)}
          </form>
        )}
      </div>
    </SectionShell>
  );
}
