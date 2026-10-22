import { createFileRoute } from "@tanstack/react-router";
import { field, Honeypot, useFormAction } from "@/components/forms/useFormAction";
import { DownloadButton } from "@/components/site/DownloadButton";
import { Icon } from "@/components/site/Icon";
import { StatusLinks, StatusPage } from "@/components/site/StatusPage";
import { inspectDownload, refreshDownload } from "@/lib/forms.functions";
import { localeFromSearch, useLocale, useT } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { getMessages } from "@/lib/i18n/messages";
import { nb } from "@/lib/i18n/rag";
import { utilityHead } from "@/lib/seo";

/**
 * Where emailed download links land. Opening the page uses nothing up; the
 * button does (see /api/download/$token), so link scanners can't spend it.
 */
export const Route = createFileRoute("/download/$token")({
  loaderDeps: ({ search }) => ({ locale: localeFromSearch(search) }),
  loader: ({ params, deps }) =>
    inspectDownload({ data: { token: params.token, locale: deps.locale } }),
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
  const locale = useLocale();
  const d = t.utility.download;

  if (state.status === "ready") {
    // An English title is marked as such inside a Greek page.
    const [before, after] = d.readyTitle.split("{title}");
    return (
      <StatusPage
        title={
          state.title ? (
            <>
              {nb(before)}
              <span lang={state.textLang !== locale ? state.textLang : undefined}>
                {state.title}
              </span>
              {nb(after ?? "")}
            </>
          ) : (
            d.readyTitleNoName
          )
        }
      >
        <p className="lead">{d.readyBody}</p>
        <div className="status-actions">
          <DownloadButton action={`/api/download/${token}`}>
            {fmt(d.button, { format: state.format === "File" ? d.file : state.format })}
          </DownloadButton>
        </div>
      </StatusPage>
    );
  }

  if (state.status === "expired") {
    return (
      <StatusPage title={d.expiredTitle}>
        <p className="lead">{state.renewable ? d.expiredBody : d.expiredPurchaseBody}</p>
        {state.renewable ? (
          <RefreshForm token={token} />
        ) : (
          <StatusLinks links={[{ label: d.contact, href: "/contact" }]} />
        )}
      </StatusPage>
    );
  }

  return (
    <StatusPage title={d.invalidTitle}>
      <p className="lead">{d.invalidBody}</p>
      <StatusLinks
        links={[
          { label: d.books, href: "/books" },
          { label: d.contact, href: "/contact" },
        ]}
      />
    </StatusPage>
  );
}

/** "Email me a fresh link": always answers the same way, so a link reveals nobody. */
function RefreshForm({ token }: { token: string }) {
  const t = useT();
  const d = t.utility.download;
  const form = useFormAction((data, turnstile) =>
    field(data, "website")
      ? Promise.resolve({ ok: true as const })
      : refreshDownload({ data: { token, turnstile } }),
  );

  return (
    <div className="status-actions">
      {form.state.step === "done" ? (
        <p ref={form.doneRef} className="status-note" tabIndex={-1}>
          <Icon name="check" />
          <span>{d.resent}</span>
        </p>
      ) : (
        <form className="status-form" {...form.formProps}>
          <Honeypot />
          {form.turnstileSlot}
          {form.alertSlot}
          <button className="btn btn-primary" {...form.submitProps}>
            {form.sending ? d.resending : d.resend}
          </button>
        </form>
      )}
      {form.statusSlot(d.resent)}
    </div>
  );
}
