export function PatternDivider() {
  return (
    <div aria-hidden className="relative flex items-center justify-center py-8">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <svg width="48" height="24" viewBox="0 0 48 24" className="mx-3 text-gold">
        <path
          d="M0 12h12l6-8 6 16 6-16 6 8h12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    </div>
  );
}
