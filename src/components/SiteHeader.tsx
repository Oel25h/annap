import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  ChevronDown,
  BookOpen,
  GraduationCap,
  ShoppingBag,
  Image as ImageIcon,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LocaleLink } from "@/components/LocaleLink";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useT } from "@/lib/i18n/context";

const navLinkBase =
  "relative text-[12px] uppercase tracking-[0.22em] text-plum/75 transition-colors hover:text-burgundy " +
  "focus-visible:outline-none focus-visible:text-burgundy " +
  "after:pointer-events-none after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:mx-auto after:h-px after:w-0 after:bg-burgundy after:transition-all after:duration-200 " +
  "hover:after:w-full focus-visible:after:w-full";
const navLinkActive = "text-burgundy after:w-full";

export function SiteHeader() {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [mobileExplore, setMobileExplore] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);
  const exploreBtnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PRIMARY = [
    { to: "/", label: t.nav.home, exact: true },
    { to: "/about", label: t.nav.about },
    { to: "/blog", label: t.nav.blog },
  ] as const;

  const EXPLORE = [
    { to: "/books", label: t.nav.books, desc: t.nav.booksDesc, Icon: BookOpen },
    {
      to: "/masterclasses",
      label: t.nav.masterclasses,
      desc: t.nav.masterclassesDesc,
      Icon: GraduationCap,
    },
    { to: "/shop", label: t.nav.shop, desc: t.nav.shopDesc, Icon: ShoppingBag },
    { to: "/gallery", label: t.nav.gallery, desc: t.nav.galleryDesc, Icon: ImageIcon },
    { to: "/foundation", label: t.nav.foundation, desc: t.nav.foundationDesc, Icon: Heart },
  ] as const;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
        setExploreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (exploreOpen) {
          setExploreOpen(false);
          exploreBtnRef.current?.focus();
        }
        if (open) {
          setOpen(false);
          setMobileExplore(false);
        }
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [exploreOpen, open]);

  const openExplore = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setExploreOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setExploreOpen(false), 120);
  };

  const closeMenu = () => {
    setOpen(false);
    setMobileExplore(false);
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-burgundy focus:px-4 focus:py-2 focus:text-ivory"
      >
        {t.common.skipToContent}
      </a>

      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "border-b border-plum/10 bg-ivory/95 py-2 backdrop-blur-md"
            : "border-b border-transparent bg-ivory/70 py-4 backdrop-blur-sm"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10">
          <LocaleLink
            to="/"
            exact
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
            aria-label="Anastasia Patience — Home"
          >
            <img
              src="/logo-ap-mark.png"
              alt=""
              width={40}
              height={27}
              className="h-8 w-auto shrink-0 sm:h-9"
              decoding="async"
            />
            <span className="font-display text-base tracking-tight text-plum sm:text-lg">
              Anastasia Patience
            </span>
          </LocaleLink>

          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            {PRIMARY.map((item) => (
              <LocaleLink
                key={item.to}
                to={item.to}
                exact={"exact" in item ? item.exact : false}
                activeClassName={navLinkActive}
                className={navLinkBase}
              >
                {item.label}
              </LocaleLink>
            ))}

            <div
              ref={exploreRef}
              className="relative"
              onMouseEnter={openExplore}
              onMouseLeave={scheduleClose}
            >
              <button
                ref={exploreBtnRef}
                type="button"
                onClick={() => setExploreOpen((v) => !v)}
                onFocus={openExplore}
                aria-expanded={exploreOpen}
                aria-haspopup="true"
                aria-controls="explore-menu"
                className={`${navLinkBase} inline-flex items-center gap-1.5 ${exploreOpen ? navLinkActive : ""}`}
              >
                {t.nav.explore}
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${exploreOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <AnimatePresence>
                {exploreOpen && (
                  <motion.div
                    id="explore-menu"
                    role="menu"
                    aria-label={t.nav.explore}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 top-full z-50 w-[36rem] -translate-x-1/2 pt-4"
                    onMouseEnter={openExplore}
                    onMouseLeave={scheduleClose}
                  >
                    <div className="rounded-2xl border border-plum/10 bg-ivory p-3 shadow-[0_10px_40px_-20px_rgba(60,20,40,0.25)]">
                      <div className="grid grid-cols-2 gap-1">
                        {EXPLORE.map(({ to, label, desc, Icon }) => (
                          <LocaleLink
                            key={to}
                            to={to}
                            role="menuitem"
                            onClick={() => setExploreOpen(false)}
                            activeClassName="bg-plum/[0.04] text-burgundy"
                            className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-plum/[0.04] focus-visible:bg-plum/[0.04] focus-visible:outline-none"
                          >
                            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-plum/10 bg-bone text-burgundy transition-colors group-hover:border-burgundy/30">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-plum group-hover:text-burgundy">
                                {label}
                              </span>
                              <span className="mt-0.5 block text-[12px] leading-snug text-plum/60">
                                {desc}
                              </span>
                            </span>
                          </LocaleLink>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <LocaleLink to="/contact" activeClassName={navLinkActive} className={navLinkBase}>
              {t.nav.contact}
            </LocaleLink>
          </nav>

          <div className="flex items-center gap-3">
            <LocaleSwitcher className="hidden sm:inline-flex" />
            <LocaleLink
              to="/start"
              className="hidden rounded-full bg-burgundy px-5 py-2.5 text-[11px] uppercase tracking-[0.24em] text-ivory transition-colors hover:bg-plum focus-visible:bg-plum focus-visible:outline-none md:inline-block"
            >
              {t.nav.startHere}
            </LocaleLink>
            <button
              onClick={() => setOpen(true)}
              aria-label={t.nav.openMenu}
              aria-expanded={open}
              className="grid h-10 w-10 place-items-center rounded-full border border-plum/15 text-plum transition-colors hover:border-burgundy hover:text-burgundy focus-visible:border-burgundy focus-visible:text-burgundy focus-visible:outline-none lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label={t.nav.mobileMenu}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-ivory text-plum pb-[env(safe-area-inset-bottom)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-plum/10 bg-ivory px-6 py-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-10">
              <LocaleLink
                to="/"
                onClick={closeMenu}
                className="flex items-center gap-2.5 font-display text-lg tracking-tight text-plum"
              >
                <img
                  src="/logo-ap-mark.png"
                  alt=""
                  width={36}
                  height={24}
                  className="h-7 w-auto"
                  decoding="async"
                />
                Anastasia Patience
              </LocaleLink>
              <div className="flex items-center gap-2">
                <LocaleSwitcher />
                <button
                  onClick={closeMenu}
                  aria-label={t.nav.closeMenu}
                  className="grid h-10 w-10 place-items-center rounded-full border border-plum/15 text-plum transition-colors hover:border-burgundy hover:text-burgundy focus-visible:border-burgundy focus-visible:outline-none"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <nav aria-label="Mobile" className="flex flex-col gap-1 px-6 py-8 md:px-10">
              {PRIMARY.map((item) => (
                <LocaleLink
                  key={item.to}
                  to={item.to}
                  exact={"exact" in item ? item.exact : false}
                  onClick={closeMenu}
                  activeClassName="text-burgundy"
                  className="border-b border-plum/10 py-4 font-display text-2xl text-plum focus-visible:text-burgundy focus-visible:outline-none"
                >
                  {item.label}
                </LocaleLink>
              ))}

              <div className="border-b border-plum/10">
                <button
                  type="button"
                  onClick={() => setMobileExplore((v) => !v)}
                  aria-expanded={mobileExplore}
                  aria-controls="mobile-explore"
                  className="flex w-full items-center justify-between py-4 font-display text-2xl text-plum focus-visible:text-burgundy focus-visible:outline-none"
                >
                  {t.nav.explore}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${mobileExplore ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                <AnimatePresence initial={false}>
                  {mobileExplore && (
                    <motion.div
                      id="mobile-explore"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pb-4 pl-4">
                        {EXPLORE.map(({ to, label, desc, Icon }) => (
                          <LocaleLink
                            key={to}
                            to={to}
                            onClick={closeMenu}
                            className="flex items-center gap-3 py-2.5 text-base text-plum/80 focus-visible:text-burgundy focus-visible:outline-none"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-burgundy" aria-hidden="true" />
                            <span className="min-w-0">{label}</span>
                            <span className="ml-1 hidden text-[11px] uppercase tracking-[0.22em] text-plum/45 sm:inline">
                              {desc}
                            </span>
                          </LocaleLink>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <LocaleLink
                to="/contact"
                onClick={closeMenu}
                activeClassName="text-burgundy"
                className="border-b border-plum/10 py-4 font-display text-2xl text-plum focus-visible:text-burgundy focus-visible:outline-none"
              >
                {t.nav.contact}
              </LocaleLink>

              <LocaleLink
                to="/start"
                onClick={closeMenu}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-burgundy px-6 py-3.5 text-[11px] uppercase tracking-[0.24em] text-ivory focus-visible:bg-plum focus-visible:outline-none"
              >
                {t.nav.startHere}
              </LocaleLink>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
