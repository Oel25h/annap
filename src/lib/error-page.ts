/**
 * The page the worker returns when rendering itself failed. It stands alone
 * (no app CSS, no fonts loaded), so the palette values from tokens.css are
 * written out here: ivory and cocoa, night in dark mode, one Tangerine action.
 * No script: "Try again" is a link to the same address, so any CSP allows it.
 */
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn’t load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#fffaf5" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1f120c" media="(prefers-color-scheme: dark)" />
    <style>
      :root {
        color-scheme: light dark;
        --bg: #fffaf5;
        --text: #3b1f14;
        --text-secondary: rgb(59 31 20 / 0.76);
        --field-border: rgb(59 31 20 / 0.52);
        --alt: #fff1e6;
        --hover: #c2410c;
        --on-hover: #fffaf5;
        --focus: #c2410c;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #1f120c;
          --text: #fff1e6;
          --text-secondary: rgb(255 241 230 / 0.76);
          --field-border: rgb(255 241 230 / 0.52);
          --alt: #3b1f14;
          --hover: #ffb27a;
          --on-hover: #3b1f14;
          --focus: #ffb27a;
        }
      }
      body { margin: 0; min-height: 100vh; display: grid; align-items: center; padding: 64px 16px; box-sizing: border-box; background: var(--bg); color: var(--text); font: 400 17px/1.65 "Source Serif 4", Georgia, serif; -webkit-font-smoothing: antialiased; }
      main { width: 100%; max-width: 720px; margin: 0 auto; }
      h1 { margin: 0; font: 400 clamp(2.75rem, 1.5rem + 4vw, 4.5rem)/1.02 "Noto Serif Display", Georgia, serif; letter-spacing: -0.022em; text-wrap: balance; }
      p { margin: 24px 0 0; max-width: 30em; font-size: 1.1875rem; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
      a { display: inline-flex; align-items: center; min-height: 48px; padding: 0 24px; border: 1px solid transparent; border-radius: 12px; font: 600 15px/1.25 "Noto Sans", system-ui, sans-serif; text-decoration: none; cursor: pointer; transition: background-color 200ms, color 200ms, border-color 200ms; }
      :focus-visible { outline: 2px solid var(--focus); outline-offset: 4px; }
      .primary { background: #f27329; color: #3b1f14; }
      .primary:hover { background: var(--hover); color: var(--on-hover); }
      .quiet { background: transparent; color: var(--text); border-color: var(--field-border); }
      .quiet:hover { background: var(--alt); border-color: var(--text); }
      @media (prefers-reduced-motion: reduce) { a { transition: none; } }
    </style>
  </head>
  <body>
    <main>
      <h1>This page didn’t load.</h1>
      <p>Something went wrong on our side. Please try again, or start again from the home page.</p>
      <div class="actions">
        <a class="primary" href="">Try again</a>
        <a class="quiet" href="/">Go home</a>
      </div>
    </main>
  </body>
</html>`;
}
