import { createFileRoute } from "@tanstack/react-router";
import { SiteLink } from "@/components/site/SiteLink";
import { StatusPage } from "@/components/site/StatusPage";
import { localeFromSearch, useLocale, useT } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";
import { utilityHead } from "@/lib/seo";

type Search = { token?: string; result?: "done" | "invalid" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The unsubscribe link at the foot of every letter. One button, no reasons
 * asked; mail apps can also unsubscribe directly (/api/newsletter/unsubscribe).
 */
export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(typeof search.token === "string" && UUID.test(search.token) ? { token: search.token } : {}),
    ...(search.result === "done" || search.result === "invalid" ? { result: search.result } : {}),
  }),
  head: ({ match }) => {
    const t = getMessages(localeFromSearch(match.search));
    return utilityHead(`${t.utility.unsubscribe.label} — ${t.seo.siteName}`);
  },
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { token, result } = Route.useSearch();
  const t = useT();
  const locale = useLocale();
  const u = t.utility.unsubscribe;

  if (result === "done") {
    return (
      <StatusPage label={u.label} title={u.doneTitle}>
        <p className="lead">{u.doneBody}</p>
        <ul className="status-links">
          <li>
            <SiteLink className="link" href="/">
              {u.home}
            </SiteLink>
          </li>
        </ul>
      </StatusPage>
    );
  }

  if (result === "invalid" || !token) {
    return (
      <StatusPage label={u.label} title={u.invalidTitle}>
        <p className="lead">{u.invalidBody}</p>
        <ul className="status-links">
          <li>
            <SiteLink className="link" href="/contact">
              {u.contact}
            </SiteLink>
          </li>
          <li>
            <SiteLink className="link" href="/">
              {u.home}
            </SiteLink>
          </li>
        </ul>
      </StatusPage>
    );
  }

  return (
    <StatusPage label={u.label} title={u.title}>
      <p className="lead">{u.body}</p>
      <form className="status-links" method="post" action="/api/newsletter/unsubscribe">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="lang" value={locale} />
        <button className="btn btn-primary" type="submit">
          {u.button}
        </button>
        <SiteLink className="btn btn-quiet" href="/">
          {u.home}
        </SiteLink>
      </form>
    </StatusPage>
  );
}
