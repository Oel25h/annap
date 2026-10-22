import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, MapPin, Clock, Check, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { useSiteSocials } from "@/lib/site-socials";
import { SOCIAL_ICONS } from "@/lib/start-icons";
import { submitContact } from "@/lib/public.functions";
import { useT } from "@/lib/i18n/context";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Anastasia Patience" },
      {
        name: "description",
        content: "For speaking invitations, media enquiries, partnerships, or a warm hello.",
      },
    ],
    links: [
      { rel: "canonical", href: "/contact" },
      { rel: "alternate", hrefLang: "en", href: "/contact" },
      { rel: "alternate", hrefLang: "el", href: "/el/contact" },
      { rel: "alternate", hrefLang: "x-default", href: "/contact" },
    ],
  }),
  component: Contact,
});

const TYPES = ["General", "Speaking", "Media", "Partnerships"] as const;

export function Contact() {
  const t = useT();
  const { data: socials = [] } = useSiteSocials();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [type, setType] = useState<(typeof TYPES)[number]>("General");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await submitContact({
        data: { name, email, enquiry_type: type, message, website },
      });
      setSent(true);
    } catch {
      setErr("Sorry, something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setSent(false);
    setName("");
    setEmail("");
    setMessage("");
    setType("General");
  }

  return (
    <main className="bg-ivory">
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 md:grid-cols-[1fr_1.2fr] md:gap-16 md:px-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/25 bg-ivory/70 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-burgundy backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-burgundy" /> {t.contact.eyebrow}
            </div>
            <h1 className="mt-7 font-display text-4xl leading-[0.98] tracking-[-0.02em] text-plum sm:text-5xl md:text-6xl lg:text-7xl xl:text-[88px]">
              {t.contact.headlineBefore}{" "}
              <em className="font-italic-display text-burgundy">{t.contact.headlineEm}</em>.
            </h1>
            <p className="mt-8 max-w-md text-lg text-ink">
              {t.contact.sub}
            </p>

            <div className="mt-10 space-y-3">
              <a
                href="mailto:hello@patiencemediahouse.com"
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-plum/10 bg-ivory p-3 pr-4 soft-shadow transition hover:-translate-y-0.5 hover:border-burgundy sm:gap-4 sm:rounded-full sm:pr-6"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-burgundy/12 text-burgundy transition group-hover:bg-burgundy group-hover:text-ivory">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-plum/55">
                    {t.contact.emailMe}
                  </div>
                  <div className="break-all font-display text-sm text-plum sm:text-base">
                    hello@patiencemediahouse.com
                  </div>
                </div>
              </a>

              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-plum/10 bg-ivory p-3 pr-4 soft-shadow sm:gap-4 sm:rounded-full sm:pr-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-burgundy/12 text-burgundy">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-plum/55">
                    {t.contact.basedIn}
                  </div>
                  <div className="font-display text-plum">{t.home.cyprus}</div>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-plum/10 bg-ivory p-3 pr-4 soft-shadow sm:gap-4 sm:rounded-full sm:pr-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-burgundy/12 text-burgundy">
                  <Clock className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-plum/55">
                    {t.contact.replyTime}
                  </div>
                  <div className="font-display text-plum">{t.contact.replyTimeValue}</div>
                </div>
              </div>
            </div>

            {socials.length > 0 && (
              <div className="mt-8 flex items-center gap-3">
                {socials.map((s) => {
                  const Icon = SOCIAL_ICONS[s.platform] ?? SOCIAL_ICONS.instagram;
                  return (
                    <a
                      key={s.id}
                      aria-label={s.platform}
                      href={s.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-11 w-11 place-items-center rounded-full border border-plum/15 bg-ivory text-plum transition hover:-translate-y-0.5 hover:border-burgundy hover:text-burgundy"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-[2.5rem] bg-bone/70 p-6 soft-shadow-lg md:p-10">
              {sent ? (
                <div className="rounded-[2rem] bg-ivory p-10 text-center soft-shadow">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-burgundy/12 text-burgundy">
                    <Check className="h-6 w-6" />
                  </div>
                  <h2 className="mt-6 font-display text-3xl text-plum">{t.contact.sentTitle}</h2>
                  <p className="mt-3 text-ink">{t.contact.sentBody}</p>
                  <button
                    onClick={resetForm}
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-burgundy px-6 py-3 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory transition hover:-translate-y-0.5 hover:bg-plum"
                  >
                    {t.contact.sendAnother} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="relative space-y-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.28em] text-plum/60">
                      {t.contact.enquiryType}
                    </label>
                    <div className="mt-3 inline-flex flex-wrap items-center gap-1 rounded-full bg-ivory p-1 soft-shadow">
                      {TYPES.map((ty) => (
                        <button
                          type="button"
                          key={ty}
                          onClick={() => setType(ty)}
                          className={`rounded-full px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] transition ${
                            type === ty
                              ? "bg-burgundy text-ivory shadow-[0_8px_20px_-12px_rgba(232,93,58,0.7)]"
                              : "text-plum/70 hover:text-burgundy"
                          }`}
                        >
                          {t.contact.types[ty]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.28em] text-plum/60">
                        {t.contact.yourName}
                      </label>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-2 h-12 w-full rounded-full border border-plum/15 bg-ivory px-5 text-plum placeholder:text-plum/40 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.28em] text-plum/60">
                        {t.contact.yourEmail}
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2 h-12 w-full rounded-full border border-plum/15 bg-ivory px-5 text-plum placeholder:text-plum/40 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.28em] text-plum/60">
                      {t.contact.message}
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="mt-2 w-full rounded-[1.5rem] border border-plum/15 bg-ivory px-5 py-4 text-plum placeholder:text-plum/40 focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/20"
                    />
                  </div>

                  <div
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                  >
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>

                  {err && (
                    <div className="rounded-2xl border border-burgundy/40 bg-burgundy/10 p-4 text-sm text-burgundy">
                      {err}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="group inline-flex items-center gap-3 rounded-full bg-burgundy px-7 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-ivory shadow-[0_14px_30px_-14px_rgba(232,93,58,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-plum disabled:opacity-60"
                  >
                    {busy ? t.contact.sending : t.contact.send}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
