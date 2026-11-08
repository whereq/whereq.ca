import { useState, type CSSProperties } from "react";
import clsx from "clsx";

interface ScreenFrameProps {
  /** Address shown in the faux browser chrome bar. */
  url: string;
  /** Screenshot to display; when absent (or it fails to load) the
   *  placeholder is shown instead. */
  src?: string;
  alt?: string;
  placeholder?: string;
  /** Accent color for the frame glow (CSS color or `var(--…)`). */
  accent?: string;
  className?: string;
  /** When set, the screenshot becomes a button that invokes this on
   *  click (e.g. to open a lightbox), with a hover "enlarge" affordance. */
  onZoom?: () => void;
}

/**
 * A screenshot inside a faux browser window — chrome bar with traffic
 * lights and a URL pill, then a 16:9.6 `contain`-fit image. Falls back to
 * a hatched placeholder when no screenshot is supplied yet, so product
 * imagery can be dropped in later without touching layout.
 *
 * Relies on the `.screen-frame` / `.screen-chrome` / `.screen-shot`
 * styles defined in the consuming page's stylesheet.
 */
export function ScreenFrame({
  url,
  src,
  alt,
  placeholder = "Screenshot coming soon",
  accent,
  className,
  onZoom,
}: ScreenFrameProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const style = accent
    ? ({ "--accent": accent } as CSSProperties)
    : undefined;

  const img = (
    <img
      className="screen-shot"
      src={src}
      alt={alt ?? `${url} screenshot`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );

  return (
    <div className={clsx("screen-frame", className)} style={style}>
      <div className="screen-chrome">
        <i />
        <i />
        <i />
        <span className="url">{url}</span>
      </div>
      {showImage ? (
        onZoom ? (
          <button
            type="button"
            className="screen-zoom"
            onClick={onZoom}
            aria-label={`Enlarge ${alt ?? url} screenshot`}
          >
            {img}
            <span className="zoom-hint" aria-hidden="true">
              ⤢ ENLARGE
            </span>
          </button>
        ) : (
          img
        )
      ) : (
        <div className="screen-placeholder">{placeholder}</div>
      )}
    </div>
  );
}
