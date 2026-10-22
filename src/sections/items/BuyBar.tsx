/**
 * The slim buy bar on a book's page, below 1024 only. It docks at the bottom
 * once the formats have scrolled up under the header, and steps aside while
 * the formats, the free eBook card or any other Tangerine fill is on screen,
 * so a view never holds two. It never hides while it holds focus. The docked
 * mini player wins over it (CSS), and without JavaScript it stays hidden.
 */
import { useEffect, useRef, useState } from "react";
import { CheckoutButton } from "@/components/site/CheckoutButton";
import { Icon } from "@/components/site/Icon";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatMoney } from "@/lib/i18n/format";
import { OfferLabel } from "@/sections/components/BookSections";
import type { BookSummary, MediaMap } from "@/sections/types";
import { Picture } from "../render/Picture";

/** Other things on the page that would compete with the bar's button. */
const FILLS = "main .btn-primary, main .play, main .listen-disc";

export function BuyBar({ book, media }: { book: BookSummary; media: MediaMap }) {
  const t = useT();
  const locale = useLocale();
  const bar = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const offer = book.offers.find((o) => o.buyHere) ?? book.offers.find((o) => o.externalUrl);

  useEffect(() => {
    const root = bar.current;
    const formats = document.getElementById("formats");
    if (!offer || !root || !formats) return;
    const phone = window.matchMedia("(max-width: 1023px)");
    const header = Math.round(document.querySelector(".site-header")?.clientHeight ?? 64);
    const inView = new Set<Element>();
    let frame = 0;

    const update = () => {
      frame = 0;
      // Passed once the formats have gone up under the header, not down off the screen.
      // Read on every scroll: a jump (an anchor, a fling) can skip the observer's thresholds.
      const passed = formats.getBoundingClientRect().bottom <= header;
      const show = phone.matches && passed && inView.size === 0;
      if (!show && root.contains(document.activeElement)) return;
      setShown(show);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target);
          else inView.delete(entry.target);
        }
        schedule();
      },
      { rootMargin: `-${header}px 0px 0px 0px` },
    );
    const blocking = [
      formats,
      document.getElementById("free-ebook"),
      ...document.querySelectorAll(FILLS),
    ];
    for (const element of blocking) {
      if (element && !root.contains(element)) observer.observe(element);
    }
    window.addEventListener("scroll", schedule, { passive: true });
    // Focus leaving the bar may let it step aside now.
    root.addEventListener("focusout", schedule);
    phone.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      root.removeEventListener("focusout", schedule);
      phone.removeEventListener("change", schedule);
    };
  }, [offer]);

  if (!offer) return null;
  const label = <OfferLabel offer={offer} />;
  return (
    <div ref={bar} className="buy-bar" hidden={!shown}>
      <div className="wrap buy-bar-inner">
        <span className="buy-bar-cover">
          {book.coverMediaId && (
            <Picture media={media[book.coverMediaId]} sizes="32px" decorative />
          )}
        </span>
        <p className="buy-bar-text">
          <span
            className="buy-bar-title"
            lang={book.textLang !== locale ? book.textLang : undefined}
          >
            {book.title}
          </span>
          {offer.buyHere && offer.priceCents !== null ? (
            <span className="meta">{formatMoney(offer.priceCents, offer.currency, locale)}</span>
          ) : (
            <span className="meta dots">
              <span>{t.sections.books.format[offer.format]}</span>
              {offer.retailer && <span>{offer.retailer}</span>}
            </span>
          )}
        </p>
        {offer.buyHere ? (
          <CheckoutButton kind="book_format" id={offer.id} label={label} small />
        ) : (
          <a
            className="btn btn-primary btn-sm"
            href={offer.externalUrl ?? undefined}
            target="_blank"
            rel="noopener"
          >
            <span>{label}</span>
            <span className="sr-only">{t.site.opensNewTab}</span>
            <Icon name="arrow-ext" />
          </a>
        )}
      </div>
    </div>
  );
}
