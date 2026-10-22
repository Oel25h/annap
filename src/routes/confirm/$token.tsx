import { createFileRoute } from "@tanstack/react-router";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { StatusLinks, StatusPage } from "@/components/site/StatusPage";
import { localeFromSearch, useLocale, useT } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";
import { utilityHead } from "@/lib/seo";

type Search = { result?: "confirmed" | "invalid" };

/**
 * The link in the confirmation email. Confirming takes a press of the button
 * (a plain form, see /api/newsletter/confirm), so a mail scanner opening the
 * link can't sign anyone up.
 */
export const Route = createFileRoute("/confirm/$token")({
  validateSearch: (search: Record<string, unknown>): Search =>
    search.result === "confirmed" || search.result === "invalid" ? { result: search.result } : {},
  head: ({ match }) => {
    const t = getMessages(localeFromSearch(match.search));
    return utilityHead(`${t.utility.confirm.label} — ${t.seo.siteName}`);
  },
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token } = Route.useParams();
  const { result } = Route.useSearch();
  const t = useT();
  const locale = useLocale();
  const c = t.utility.confirm;

  if (result === "confirmed") {
    return (
      <StatusPage title={c.confirmedTitle}>
        <p className="lead">{c.confirmedBody}</p>
        <StatusLinks
          links={[
            { label: c.stories, href: "/blog" },
            { label: c.home, href: "/" },
          ]}
        />
      </StatusPage>
    );
  }

  if (result === "invalid") {
    return (
      <StatusPage title={c.invalidTitle}>
        <p className="lead">{c.invalidBody}</p>
        <div className="status-actions">
          <NewsletterForm source="confirm-retry" headingLevel="h2" />
        </div>
      </StatusPage>
    );
  }

  return (
    <StatusPage title={c.title}>
      <p className="lead">{c.body}</p>
      <form className="status-actions" method="post" action="/api/newsletter/confirm">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="lang" value={locale} />
        <button className="btn btn-primary" type="submit">
          {c.button}
        </button>
      </form>
    </StatusPage>
  );
}
