/**
 * A collection item's page: its intro (and, for a book, the buy bar) around
 * the page's sections. Only item routes import it, so visitors to other pages
 * never download the item renderers.
 */
import { BuyBar } from "./items/BuyBar";
import { ItemIntro } from "./items/ItemIntro";
import { PageView, type IntroView } from "./PageView";
import type { PageData } from "./types";

const Intro: IntroView = ({ page, listenAnchor }) =>
  page.intro ? (
    <ItemIntro
      intro={page.intro}
      media={page.media}
      locale={page.locale}
      listenAnchor={listenAnchor}
      indexed={page.indexed ?? false}
    />
  ) : null;

export function ItemPageView({ page }: { page: PageData }) {
  return (
    <>
      <PageView page={page} Intro={Intro} />
      {page.intro?.kind === "book" && <BuyBar book={page.intro.book} media={page.media} />}
    </>
  );
}
