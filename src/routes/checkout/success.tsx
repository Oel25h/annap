import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DownloadButton } from "@/components/site/DownloadButton";
import { SiteLink } from "@/components/site/SiteLink";
import { StatusPage } from "@/components/site/StatusPage";
import { localeFromSearch, useLocale, useT } from "@/lib/i18n/context";
import { fmt, formatMoney } from "@/lib/i18n/format";
import { getMessages } from "@/lib/i18n/messages";
import { checkoutStatus, type CheckoutStatus } from "@/lib/payments.functions";
import { utilityHead } from "@/lib/seo";

type Search = { order?: string; donation?: string; session?: string };

const pick = (value: unknown) =>
  typeof value === "string" && value.length <= 300 ? value : undefined;

/** Polls while Stripe confirms: every 2.5 seconds, for about 20 seconds. */
const POLL_MS = 2500;
const POLLS = 8;

/**
 * Where Stripe Checkout returns after paying. It shows the order or gift once
 * the payment is confirmed (by the webhook, or by asking Stripe), with
 * download buttons for anything digital.
 */
export const Route = createFileRoute("/checkout/success")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    order: pick(search.order),
    donation: pick(search.donation),
    session: pick(search.session),
  }),
  loaderDeps: ({ search }) => ({
    order: search.order,
    donation: search.donation,
    session: search.session,
  }),
  loader: ({ deps }): Promise<CheckoutStatus> | CheckoutStatus => {
    const id = deps.donation ?? deps.order;
    if (!id || !deps.session) return { status: "invalid" };
    return checkoutStatus({
      data: { kind: deps.donation ? "donation" : "order", id, session: deps.session },
    });
  },
  head: ({ match }) => {
    const t = getMessages(localeFromSearch(match.search));
    return utilityHead(`${t.utility.checkout.label} — ${t.seo.siteName}`);
  },
  component: SuccessPage,
});

function SuccessPage() {
  const status = Route.useLoaderData();
  const t = useT();
  const locale = useLocale();
  const c = t.utility.checkout;
  const router = useRouter();
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (status.status !== "pending" || polls >= POLLS) return;
    const timer = setTimeout(() => {
      setPolls((n) => n + 1);
      void router.invalidate();
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [status.status, polls, router]);

  if (status.status === "pending") {
    return (
      <StatusPage label={c.label} title={c.pendingTitle}>
        <p className="lead" role="status" aria-live="polite">
          {polls >= POLLS ? c.pendingSlow : c.pendingBody}
        </p>
      </StatusPage>
    );
  }

  if (status.status !== "paid") {
    const copy = {
      invalid: [c.invalidTitle, c.invalidBody],
      closed: [c.closedTitle, c.closedBody],
      refunded: [c.refundedTitle, c.refundedBody],
    }[status.status];
    return (
      <StatusPage label={c.label} title={copy[0]}>
        <p className="lead">{copy[1]}</p>
        <ul className="status-links">
          <li>
            <SiteLink className="link" href="/contact">
              {c.contact}
            </SiteLink>
          </li>
          <li>
            <SiteLink className="link" href="/">
              {c.home}
            </SiteLink>
          </li>
        </ul>
      </StatusPage>
    );
  }

  const receipt = status.email ? fmt(c.receipt, { email: status.email }) : c.receiptNoEmail;

  if (status.kind === "donation") {
    const amount = formatMoney(status.amountCents, status.currency, locale);
    return (
      <StatusPage label={c.label} title={c.giftTitle}>
        <p className="lead">{fmt(status.monthly ? c.giftMonthly : c.giftBody, { amount })}</p>
        <p className="status-note">{receipt}</p>
        <ul className="status-links">
          <li>
            <SiteLink className="link" href="/foundation">
              {c.foundation}
            </SiteLink>
          </li>
          <li>
            <SiteLink className="link" href="/">
              {c.home}
            </SiteLink>
          </li>
        </ul>
      </StatusPage>
    );
  }

  return (
    <StatusPage label={c.label} title={c.orderTitle}>
      <p className="lead">{receipt}</p>

      <div className="receipt">
        <p className="receipt-number">{fmt(c.orderNumber, { number: status.number })}</p>
        <ul className="receipt-lines">
          {status.lines.map((line, i) => (
            <li key={i}>
              <span className="receipt-item">
                {line.title}
                {line.quantity > 1 && (
                  <span className="receipt-qty">{fmt(c.quantity, { n: line.quantity })}</span>
                )}
              </span>
              <span className="receipt-amount">
                {formatMoney(line.totalCents, status.currency, locale)}
              </span>
            </li>
          ))}
        </ul>
        <p className="receipt-total">
          <span>{c.total}</span>
          <span>{formatMoney(status.totalCents, status.currency, locale)}</span>
        </p>
      </div>

      {status.ships && <p className="status-note">{c.ships}</p>}

      {status.downloads.length > 0 && (
        <div className="receipt-downloads">
          <h2 className="title">{c.downloadsTitle}</h2>
          <p className="status-note">{c.downloadsBody}</p>
          {status.downloads.map((item) => (
            <div key={item.title} className="receipt-download">
              <p className="receipt-item">{item.title}</p>
              <div className="actions">
                {item.links.map((link) => (
                  <DownloadButton key={link.action} action={link.action}>
                    {fmt(t.utility.download.button, { format: link.label })}
                  </DownloadButton>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {status.downloadsByEmail && <p className="status-note">{c.downloadsByEmail}</p>}

      <ul className="status-links">
        <li>
          <SiteLink className="link" href="/books">
            {c.books}
          </SiteLink>
        </li>
        <li>
          <SiteLink className="link" href="/">
            {c.home}
          </SiteLink>
        </li>
      </ul>
    </StatusPage>
  );
}
