/**
 * Netlify inserts an HTML comment and a line break into the head of every
 * production page, after the charset meta. React hydrates the whole document,
 * so those extra nodes cause a hydration mismatch (React error #418) and a
 * full client re-render on every load. This inline script runs during parsing,
 * before the app's module script, and removes comments and whitespace-only
 * text from the head. React's own head markup contains neither.
 */
export const STRIP_HOST_MARKUP_SCRIPT =
  "for(const n of Array.from(document.head.childNodes))" +
  "if(n.nodeType===8||(n.nodeType===3&&!n.textContent.trim()))n.remove();";
