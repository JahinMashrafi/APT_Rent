import { useState } from "react";
import ImageLightbox from "./ImageLightbox.jsx";

// Accepts absolute http(s) URLs (Supabase storage), root-relative paths, blob: and data:image URIs.
// Rejects "", null, "null", "undefined" and anything else that would render a broken image.
const VALID_URL = /^(https?:\/\/|\/(?!\/)|blob:|data:image\/)/i;

export const cleanAvatarUrl = (value) => {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (!url || url === "null" || url === "undefined") return "";
  return VALID_URL.test(url) ? url : "";
};

/**
 * Round avatar with graceful fallback.
 *  - Shows the initial immediately; the photo fades in once it has actually loaded.
 *  - If the URL is missing/invalid or fails to load, the initial stays (no broken-image icon).
 *  - Reacts to `src` changing (login hydration, new upload) without a page refresh:
 *    load/error status is stored per-URL, so a new URL starts fresh automatically.
 *
 * Pass the existing avatar class (e.g. "unit-avatar", "landlord-avatar", "user-chip-avatar")
 * as className so size and colors stay as they were.
 */
export default function Avatar({ src, name, fallback, className = "", style, alt = "", title, zoomable = false }) {
  const url = cleanAvatarUrl(src);
  const [status, setStatus] = useState({ url: "", state: "idle" });
  const [zoomed, setZoomed] = useState(false);
  const state = status.url === url ? status.state : "idle"; // stale status for an old URL is ignored

  const initial = fallback ?? ((name || "").trim()[0] || "?").toUpperCase();
  const showImage = Boolean(url) && state !== "error";

  const canZoom = zoomable && showImage && state === "loaded";

  return (
    <>
    <span
      className={className}
      style={{ position: "relative", overflow: "hidden", ...(canZoom ? { cursor: "zoom-in" } : null), ...style }}
      title={title}
      aria-hidden={alt || canZoom ? undefined : "true"}
      role={canZoom ? "button" : undefined}
      tabIndex={canZoom ? 0 : undefined}
      onClick={
        canZoom
          ? (e) => {
              e.stopPropagation();
              setZoomed(true);
            }
          : undefined
      }
      onKeyDown={canZoom ? (e) => (e.key === "Enter" || e.key === " ") && setZoomed(true) : undefined}
    >
      {initial}
      {showImage ? (
        <img
          key={url}
          src={url}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          onLoad={() => setStatus({ url, state: "loaded" })}
          onError={() => setStatus({ url, state: "error" })}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "inherit",
            opacity: state === "loaded" ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        />
      ) : null}
    </span>
    {zoomed && canZoom ? <ImageLightbox src={url} alt={alt || name || ""} onClose={() => setZoomed(false)} /> : null}
    </>
  );
}