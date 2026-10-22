import { useLocale, useT } from "@/lib/i18n/context";
import { nb } from "@/lib/i18n/rag";
import type { SiteShell } from "@/server/site.server";
import { NewsletterForm } from "./NewsletterForm";
import { SiteLink } from "./SiteLink";

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  linkedin: "LinkedIn",
  threads: "Threads",
  spotify: "Spotify",
  email: "Email",
  website: "Website",
};

/**
 * The footer: the Letters sign-up (left out by CSS when the page has its own),
 * the brand and one footer nav (Explore, Company, Follow), and the legal row.
 */
export function SiteFooter({ shell }: { shell: SiteShell }) {
  const t = useT();
  const locale = useLocale();
  const { settings, menus } = shell;
  const greekBlurb = locale === "el" ? settings.greek.footerText : "";
  const blurb = greekBlurb || settings.footerText || t.site.footer.blurb;
  const blurbLang = !greekBlurb && settings.footerText ? "en" : locale;
  // Social links are words; a placeholder without a real address is left out.
  const socials = shell.socials.filter((social) => social.url.startsWith("https://"));

  return (
    <footer className="back band-cocoa">
      <div className="wrap">
        <div className="signup grid-12">
          <div className="signup-copy">
            <h2 id="letters-title" className="display-l">
              {nb(t.site.footer.lettersTitle)}
            </h2>
            <p className="body">{t.site.footer.lettersBody}</p>
          </div>
          <NewsletterForm source="footer" labelledBy="letters-title" headingLevel="h3" />
        </div>
        <div className="foot grid-12">
          <div className="foot-brand">
            <p className="wordmark">{settings.siteName}</p>
            <p className="small" lang={blurbLang}>
              {blurb}
            </p>
          </div>
          <nav className="foot-nav" aria-label={t.site.footer.nav}>
            {menus.footer.map((group) => (
              <div key={group.id} className="foot-col">
                <h3 lang={group.labelLang}>{group.label}</h3>
                <ul>
                  {group.children.map((item) => (
                    <li key={item.id}>
                      <SiteLink href={item.href} lang={item.labelLang}>
                        {item.label}
                      </SiteLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {socials.length > 0 && (
              <div className="foot-col foot-follow">
                <h3>{t.site.footer.follow}</h3>
                <ul>
                  {socials.map((social) => (
                    <li key={social.id}>
                      <SiteLink href={social.url} rel="me">
                        {social.label || PLATFORM_NAMES[social.platform] || social.platform}
                      </SiteLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </nav>
        </div>
        <div className="legal grid-12">
          <span suppressHydrationWarning>
            © {new Date().getFullYear()} {settings.legal.name || settings.siteName}.{" "}
            {t.site.footer.rights}
          </span>
          {menus.legal.length > 0 && (
            <ul aria-label={t.site.footer.legal}>
              {menus.legal.map((item) => (
                <li key={item.id}>
                  <SiteLink href={item.href} lang={item.labelLang}>
                    {item.label}
                  </SiteLink>
                </li>
              ))}
            </ul>
          )}
          <span>{t.site.footer.basedIn}</span>
        </div>
      </div>
    </footer>
  );
}
