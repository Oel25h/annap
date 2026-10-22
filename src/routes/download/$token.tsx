import { createFileRoute } from "@tanstack/react-router";
import { field, Honeypot, useFormAction } from "@/components/forms/useFormAction";
import { DownloadButton } from "@/components/site/DownloadButton";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { StatusPage } from "@/components/site/StatusPage";
import { inspectDownload, refreshDownload } from "@/lib/forms.functions";
import { localeFromSearch, useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { getMessages } from "@/lib/i18n/messages";
import { utilityHead } from "@/lib/seo";

/**
 * Where emailed download links land. Opening the page uses nothing up; the
 * button does (see /api/download/$token), so link scanners can't spend it.
 */
export const Route = createFileRoute("/download/$token")({
  loader: ({ params }) => inspectDownload({ data: params.token }),
  head: ({ match }) => {
    const t = getMessages(localeFromSearch(match.search));
    return utilityHead(`${t.utility.download.label} — ${t.seo.siteName}`);
  },
  component: DownloadPage,
});

function DownloadPage() {
  const state = Route.useLoaderData();
  const { token } = Route.useParams();
  const t = useT();
  const d = t.utility.download;

  if (state.status === "ready") {
    return (
      <StatusPage
        label={d.label}
        title={state.title ? fmt(d.readyTitle, { title: state.title }) : d.readyTitleNoName}
      >
        <p className="lead">{d.readyBody}</p>
        <div className="status-links">
          <DownloadButton action={`/api/download/${token}`}>
            {fmt(d.button, { format: state.format })}
          </DownloadButton>
        </div>
      </StatusPage>
    );
  }

  if (state.status === "expired") {
    return (
      <StatusPage label={d.label} title={d.expiredTitle}>
        <p className="lead">{state.renewable ? d.expiredBody : d.expiredPurchaseBody}</p>
        {state.renewable ? (
          <RefreshForm token={token} />
        ) : (
          <ul className="status-links">
            <li>
              <SiteLink className="link" href="/contact">
                {d.contact}
              </SiteLink>
            </li>
          </ul>
        )}
      </StatusPage>
    );
  }

  return (
    <StatusPage label={d.label} title={d.invalidTitle}>
      <p className="lead">{d.invalidBody}</p>
      <ul className="status-links">
        <li>
          <SiteLink className="link" href="/books">
            {d.books}
          </SiteLink>
        </li>
        <li>
          <SiteLink className="link" href="/contact">
            {d.contact}
          </SiteLink>
        </li>
      </ul>
    </StatusPage>
  );
}

/** "Email me a fresh link": always answers the same way, so a link reveals nobody. */
function RefreshForm({ token }: { token: string }) {
  const t = useT();
  const { state, sending, formProps, turnstileSlot } = useFormAction((data, turnstile) =>
    field(data, "website")
      ? Promise.resolve({ ok: true as const })
      : refreshDownload({ data: { token, turnstile } }),
  );

  if (state.step === "done") {
    return (
      <p className="status-note" role="status">
        <Icon name="check" />
        <span>{t.utility.download.resent}</span>
      </p>
    );
  }
  return (
    <form className="status-links" {...formProps}>
      <Honeypot />
      <button className="btn btn-primary" type="submit" aria-disabled={sending || undefined}>
        {sending ? t.sections.forms.sending : t.utility.download.resend}
      </button>
      {turnstileSlot}
      <p className="form-status" role="status" aria-live="polite">
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
