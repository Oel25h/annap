import { useId } from "react";
import { field, Honeypot, useFormAction } from "@/components/forms/useFormAction";
import { useLocale, useT } from "@/lib/i18n/context";
import { subscribe } from "@/lib/forms.functions";
import { Icon } from "./Icon";
import { SiteLink } from "./SiteLink";

/**
 * Email signup for the weekly letters, with double opt-in: success asks the
 * reader to confirm from their inbox. Keeps what was typed on any error.
 */
export function NewsletterForm({ source, buttonLabel }: { source: string; buttonLabel?: string }) {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const { state, sending, formProps, turnstileSlot } = useFormAction((data, turnstile) =>
    subscribe({
      data: {
        email: field(data, "email"),
        locale,
        source,
        website: field(data, "website"),
        turnstile,
      },
    }),
  );

  if (state.step === "done") {
    return (
      <div className="signup-done" role="status">
        <p className="title">{t.sections.newsletter.doneTitle}</p>
        <p className="body">{t.sections.newsletter.doneBody}</p>
      </div>
    );
  }

  return (
    <form className="signup-form" {...formProps}>
      <div className="field">
        <label htmlFor={`${id}-email`}>{t.site.footer.emailLabel}</label>
        <div className="inline-field">
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t.site.footer.emailPlaceholder}
            required
            maxLength={320}
            aria-invalid={state.step === "error" || undefined}
            aria-describedby={`${id}-status`}
          />
          <button className="btn btn-primary" type="submit" aria-disabled={sending || undefined}>
            {sending ? t.sections.forms.sending : buttonLabel || t.site.footer.subscribe}
          </button>
        </div>
        <Honeypot />
      </div>
      {turnstileSlot}
      <p className="fine">
        <Icon name="lock" />
        <span>{t.site.footer.unsubscribeAnytime}</span>
        <SiteLink href="/privacy">{t.site.footer.privacy}</SiteLink>
      </p>
      <p id={`${id}-status`} className="form-status" role="status" aria-live="polite">
        {state.step === "error" && (
          <span className="field-error">
            <Icon name="alert" />
            {state.message}
          </span>
        )}
      </p>
    </form>
  );
}
