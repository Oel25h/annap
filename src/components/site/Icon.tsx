/**
 * The one icon family: 24 px grid, 1.5 stroke, round caps and joins,
 * currentColor, no fills. Decorative unless given a label.
 */
const PATHS = {
  headphones: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="4" y="14" width="4" height="6" rx="1.2" />
      <rect x="16" y="14" width="4" height="6" rx="1.2" />
    </>
  ),
  play: (
    <>
      <path d="M8 5.5v13l10.5-6.5z" />
    </>
  ),
  pause: (
    <>
      <path d="M8.5 5.5v13M15.5 5.5v13" />
    </>
  ),
  prev: (
    <>
      <path d="M18 6.5v11L9.5 12z" />
      <path d="M6 6v12" />
    </>
  ),
  next: (
    <>
      <path d="M6 6.5v11l8.5-5.5z" />
      <path d="M18 6v12" />
    </>
  ),
  back: (
    <>
      <path d="M7.2 6.7A8 8 0 1 1 4.6 12" />
      <path d="M7.5 2.8v4.1H3.4" />
    </>
  ),
  fwd: (
    <>
      <path d="M16.8 6.7A8 8 0 1 0 19.4 12" />
      <path d="M16.5 2.8v4.1h4.1" />
    </>
  ),
  check: (
    <>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  "arrow-ext": (
    <>
      <path d="M7 17 17 7M9 7h8v8" />
    </>
  ),
  "arrow-up": (
    <>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </>
  ),
  "arrow-down": (
    <>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  heart: (
    <>
      <path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z" />
    </>
  ),
  menu: (
    <>
      <path d="M4 8h16M4 16h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10.5 5.2 8.2 4.5 4 4.5v13c4.2 0 6.5.7 8 2 1.5-1.3 3.8-2 8-2v-13c-4.2 0-6.5.7-8 2z" />
      <path d="M12 6.5v13" />
    </>
  ),
  "chev-down": (
    <>
      <path d="M6 9l6 6 6-6" />
    </>
  ),
  "chev-up": (
    <>
      <path d="M6 15l6-6 6 6" />
    </>
  ),
  "chev-left": (
    <>
      <path d="M15 6l-6 6 6 6" />
    </>
  ),
  "chev-right": (
    <>
      <path d="M9 6l6 6-6 6" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5M12 16h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 20.5s6-5.4 6-10.5a6 6 0 0 0-12 0c0 5.1 6 10.5 6 10.5z" />
      <circle cx="12" cy="10" r="2.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="1.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  expand: (
    <>
      <path d="M14 4.5h5.5V10M10 19.5H4.5V14M19.5 4.5 13.5 10.5M4.5 19.5l6-6" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  label,
  className = "i",
}: {
  name: IconName;
  label?: string;
  className?: string;
}) {
  const a11y = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true, focusable: false };
  return (
    <svg className={className} viewBox="0 0 24 24" {...a11y}>
      {PATHS[name]}
    </svg>
  );
}
