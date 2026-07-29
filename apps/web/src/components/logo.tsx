import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="VishwaVaani home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 38 38" role="img">
          <path d="M7 20.5c3.8-8 6-8 9.8 0s6 8 10 0" />
          <path d="M7 14.5c3.8 8 6 8 9.8 0s6-8 10 0" />
        </svg>
      </span>
      {!compact && (
        <span>
          <strong>VishwaVaani</strong>
          <small>Speak into the world</small>
        </span>
      )}
    </Link>
  );
}
