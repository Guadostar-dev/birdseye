type LogoProps = {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
  inverted?: boolean;
};

export function LeafMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M32 4c14 8 26 22 26 36 0 12-10 20-22 20-4 0-8-1-11-3 6-5 10-12 11-21C27 46 18 52 8 54 14 34 22 16 32 4Z"
        fill="currentColor"
      />
      <path
        d="M33 18c4 10 5 20 3 30"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function Logo({ className = "", markClassName, wordmark = true, inverted = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span
        className={`grid place-items-center rounded-2xl ${inverted ? "bg-white text-be-red" : "bg-be-red text-white"} ${markClassName ?? "h-11 w-11"}`}
      >
        <LeafMark className="h-7 w-7" />
      </span>
      {wordmark ? (
        <span className="leading-tight">
          <span className={`block text-lg font-extrabold tracking-tight ${inverted ? "text-white" : "text-be-navy"}`}>
            Birds Eye
          </span>
          <span className={`block text-xs font-semibold uppercase tracking-[0.18em] ${inverted ? "text-be-gold-soft" : "text-be-blue"}`}>
            Man-Tech Portal
          </span>
        </span>
      ) : null}
    </div>
  );
}
