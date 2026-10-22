import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { subscribeEmail } from "@/lib/public.functions";
import { useT } from "@/lib/i18n/context";

type Variant = "inline" | "banded" | "compact";

function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor="email-capture-website">Website</label>
      <input
        id="email-capture-website"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function EmailCapture({
  variant = "inline",
  headline,
  sub,
  cta,
  source,
}: {
  variant?: Variant;
  headline?: string;
  sub?: string;
  cta?: string;
  source?: string;
}) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [done, setDone] = useState(false);

  const resolvedHeadline = headline ?? t.emailCapture.headline;
  const resolvedSub = sub ?? t.emailCapture.sub;
  const resolvedCta = cta ?? t.emailCapture.cta;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    try {
      await subscribeEmail({
        data: {
          email,
          website,
          source: source ?? (typeof window !== "undefined" ? window.location.pathname : null),
        },
      });
    } catch {
      // Still show success to avoid leaking rate-limit / validation details to bots
    }
    setDone(true);
  }

  if (variant === "banded") {
    return (
      <section className="px-4 py-16 md:px-8 md:py-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-plum/10 bg-bone px-6 py-16 soft-shadow-lg md:rounded-[3rem] md:px-16 md:py-24">
          <div className="relative grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-ivory/70 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-burgundy">
                <span className="h-1.5 w-1.5 rounded-full bg-burgundy" />
                {t.emailCapture.freeGuide}
              </div>
              <h2 className="font-display text-4xl leading-[1.05] text-plum md:text-6xl">
                {t.emailCapture.bandedHeadlineBefore}{" "}
                <em className="font-italic-display text-burgundy">
                  {t.emailCapture.bandedHeadlineEm}
                </em>{" "}
                {t.emailCapture.bandedHeadlineAfter}
              </h2>
              <p className="mt-6 max-w-md text-plum/75">{resolvedSub}</p>
            </div>
            <form onSubmit={onSubmit} className="relative w-full">
              <Honeypot value={website} onChange={setWebsite} />
              {done ? (
                <div className="flex items-center gap-3 rounded-full border border-burgundy/40 bg-ivory/85 px-6 py-5 text-plum soft-shadow">
                  <Check className="h-5 w-5 text-burgundy" />
                  <span className="text-sm">{t.emailCapture.success}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-[1.75rem] bg-ivory/90 p-1.5 soft-shadow-lg sm:flex-row sm:items-center sm:rounded-full">
                  <label htmlFor="email-capture-banded" className="sr-only">
                    {t.emailCapture.placeholder}
                  </label>
                  <input
                    id="email-capture-banded"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailCapture.placeholder}
                    className="min-w-0 w-full flex-1 rounded-full bg-transparent px-5 py-3 text-plum placeholder:text-plum/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-burgundy/15"
                  />
                  <button
                    type="submit"
                    className="group inline-flex w-full min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-burgundy px-5 py-3 text-[11px] font-medium uppercase tracking-[0.22em] text-ivory shadow-[0_10px_24px_-14px_rgba(232,93,58,0.7)] transition hover:-translate-y-0.5 hover:bg-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory sm:w-auto sm:px-6"
                  >
                    <span>{resolvedCta}</span>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </button>
                </div>
              )}
              <p className="mt-3 pl-2 text-xs text-plum/50">{t.emailCapture.noSpam}</p>
            </form>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "compact") {
    return (
      <form onSubmit={onSubmit} className="relative w-full">
        <Honeypot value={website} onChange={setWebsite} />
        {done ? (
          <div className="flex items-center gap-2 text-sm text-plum">
            <Check className="h-4 w-4 text-burgundy" /> {t.emailCapture.successShort}
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-1 rounded-full border border-plum/15 bg-ivory p-1 soft-shadow">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailCapture.placeholderShort}
              className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-2 text-sm text-plum placeholder:text-plum/40 focus:outline-none"
            />
            <button
              type="submit"
              aria-label={resolvedCta}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-burgundy text-ivory transition hover:bg-plum"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </form>
    );
  }

  return (
    <div className="rounded-3xl border border-gold/30 bg-bone p-8 soft-shadow md:p-10">
      <div className="mb-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-burgundy">
        <span className="h-px w-8 bg-burgundy" />
        <span>{t.emailCapture.freeGuide}</span>
      </div>
      <h3 className="font-display text-2xl leading-tight text-plum md:text-3xl">
        {resolvedHeadline}
      </h3>
      <p className="mt-2 text-sm text-ink">{resolvedSub}</p>
      <form onSubmit={onSubmit} className="relative mt-6">
        <Honeypot value={website} onChange={setWebsite} />
        {done ? (
          <div className="flex items-center gap-2 text-plum">
            <Check className="h-5 w-5 text-burgundy" /> {t.emailCapture.success}
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-[1.75rem] border border-plum/15 bg-ivory p-1.5 sm:flex-row sm:items-center sm:rounded-full">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailCapture.placeholder}
              className="min-w-0 w-full flex-1 rounded-full bg-transparent px-5 py-2.5 text-plum placeholder:text-plum/40 focus:outline-none"
            />
            <button
              type="submit"
              className="group inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-burgundy px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-ivory transition hover:-translate-y-0.5 hover:bg-plum sm:w-auto"
            >
              {resolvedCta} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
