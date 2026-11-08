import { useEffect, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";

interface ImageLightboxProps {
  open: boolean;
  /** Full-size image to display; only loaded while open. */
  src?: string;
  alt?: string;
  onClose: () => void;
  /** Accent color for themed actions (CSS color or `var(--…)`). */
  accent?: string;
  /** Short caption (e.g. the page domain). */
  caption?: ReactNode;
  /** Optional action area, e.g. a "Visit ↗" link. */
  actions?: ReactNode;
}

/**
 * Full-screen image lightbox: dark blurred backdrop, vertically scrollable
 * image (ideal for tall full-page screenshots), caption + actions bar.
 * Closes on Esc, backdrop click, or the ✕ button, and locks background
 * scroll while open. Styled via `.lightbox*` classes supplied by the
 * consuming page's stylesheet.
 */
export function ImageLightbox({
  open,
  src,
  alt,
  onClose,
  accent,
  caption,
  actions,
}: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const style = accent ? ({ "--accent": accent } as CSSProperties) : undefined;

  return (
    <div
      className={clsx("lightbox", open && "is-open")}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      style={style}
      onClick={onClose}
    >
      <button
        className="lightbox-close"
        type="button"
        aria-label="Close"
        onClick={onClose}
      >
        ✕
      </button>
      <div className="lightbox-scroll">
        {open && src ? (
          <img className="lightbox-img" src={src} alt={alt} onClick={stop} />
        ) : null}
      </div>
      {(caption || actions) && (
        <div className="lightbox-bar" onClick={stop}>
          <span className="lightbox-caption">{caption}</span>
          <div className="lightbox-actions">{actions}</div>
        </div>
      )}
    </div>
  );
}
