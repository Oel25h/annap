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
  // The studio's tools
  grip: (
    <>
      <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="2.4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.8A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.4 7.4A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.3-1" />
      <path d="M10 10a3 3 0 0 0 4 4" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  minus: (
    <>
      <path d="M5 12h14" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  redo: (
    <>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </>
  ),
  more: (
    <>
      <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="2.6" />
    </>
  ),
  desktop: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  tablet: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  missing: (
    <>
      <circle cx="12" cy="12" r="8.5" strokeDasharray="3 2.6" />
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
