import type { LocationRewrite } from "@tanstack/react-router";

/**
 * Greek lives under /el with the same slugs as English. The router never sees
 * the prefix: on the way in, `/el/about` becomes `/about?lang=el`; on the way
 * out, `lang=el` becomes the `/el` prefix again. The root route retains `lang`
 * across navigations, so every link stays in the current language and the
 * language switch is an ordinary client-side navigation.
 *
 * The studio, auth and API paths are never prefixed.
 */
export const LANG_PARAM = "lang";
const UNLOCALIZED = /^\/(admin|auth|api)(\/|$)/;
const GREEK_PREFIX = /^\/el(\/|$)/;

export const localeRewrite: LocationRewrite = {
  input: ({ url }) => {
    if (GREEK_PREFIX.test(url.pathname)) {
      url.pathname = url.pathname.slice(3) || "/";
      url.searchParams.set(LANG_PARAM, "el");
    } else {
      // A hand-typed ?lang=el on an English URL is ignored.
      url.searchParams.delete(LANG_PARAM);
    }
    return url;
  },
  output: ({ url }) => {
    const greek = url.searchParams.get(LANG_PARAM) === "el";
    url.searchParams.delete(LANG_PARAM);
    if (greek && !UNLOCALIZED.test(url.pathname)) {
      url.pathname = url.pathname === "/" ? "/el" : `/el${url.pathname}`;
    }
    return url;
  },
};
