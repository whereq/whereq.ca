import type { CSSProperties, ReactNode } from "react";

interface KickerProps {
  /** Two-digit section index, e.g. "01". */
  num?: string;
  /** Accent color override (CSS color or `var(--…)`). */
  accent?: string;
  children: ReactNode;
}

/**
 * Monospace section eyebrow with a leading rule and optional number,
 * matching the deep-space design system. Carries `data-reveal` so it
 * participates in scroll-reveal automatically.
 */
export function Kicker({ num, accent, children }: KickerProps) {
  const style = accent
    ? ({ "--kicker-accent": accent } as CSSProperties)
    : undefined;
  return (
    <p className="kicker" data-reveal="" style={style}>
      {num ? <em>{num}</em> : null} {children}
    </p>
  );
}
