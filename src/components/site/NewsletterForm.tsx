import { useId } from "react";
import { EMAIL, field, Honeypot, useFormAction } from "@/components/forms/useFormAction";
import { useLocale, useT } from "@/lib/i18n/context";
import { subscribe } from "@/lib/forms.functions";
import { Icon } from "./Icon";
import { SiteLink } from "./SiteLink";

/**
 * Email sign-up for the weekly letters, with double opt-in: success asks the
 * reader to confirm from their inbox. The same pattern as the free eBook form:
 * the label above and no placeholder; the field checked on submit, then on
 * blur; "Subscribing…" while it sends; and success in place, focused and
 * announced. Whatever was typed stays on any error.
 */
export function NewsletterForm({
  source,
  labelledBy,
  headingLevel: Done = "h3",
}: {
  source: string;
  /** The id of the heading that names the form. */
  labelledBy?: string;
  /** The success heading: one level under the heading above the form. */
  headingLevel?: "h2" | "h3";
}) {
  const t = useT();
  const locale = useLocale();
  const id = useId();
  const f = t.site.footer;
  const form = useFormAction(
    (data, turnstile) =>
      subscribe({
        data: {
          email: field(data, "email"),
          locale,
          source,
          website: field(data, "website"),
          turnstile,
        },
      }),
    // The email is the only field, so the server's "invalid" can only mean it.
    { invalid: f.emailInvalid },
    { checks: { email: (value) => !EMAIL.test(value.trim()) && f.emailInvalid } },
  );

  return (
    <div className="signup-form">
      {form.state.step === "done" ? (
        <div className="signup-done">
          <Done ref={form.doneRef} className="title" tabIndex={-1}>
            {f.doneTitle}
          </Done>
          <p className="body">{f.doneBody}</p>
        </div>
      ) : (
        <form noValidate aria-labelledby={labelledBy} {...form.formProps}>
          <div className="field">
            <label htmlFor={`${id}-email`}>{f.emailLabel}</label>
            <div className="inline-field">
              <input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                required
                maxLength={320}
                {...form.fieldProps("email")}
              />
              <button className="btn btn-primary" {...form.submitProps}>
                {form.sending ? f.subscribing : f.subscribe}
              </button>
            </div>
            {form.fieldError("email")}
            <Honeypot />
          </div>
          {form.alertSlot}
          {form.turnstileSlot}
          <p className="fine">
            <span className="fine-note">
              <Icon name="lock" />
              <span>{f.unsubscribeAnytime}</span>
            </span>
            <SiteLink href="/privacy">{f.privacy}</SiteLink>
          </p>
        </form>
      )}
      {form.statusSlot(`${f.doneTitle} ${f.doneBody}`)}
    </div>
  );
}
