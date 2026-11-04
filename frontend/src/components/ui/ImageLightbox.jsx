import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Full-screen image viewer (like tapping a profile picture on Instagram / X).
 * Click the backdrop, the close button or press Escape to dismiss.
 */
export default function ImageLightbox({ src, alt = "", onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        cursor: "zoom-out",
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: "absolute",
          top: 16,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.15)",
          color: "#fff",
          fontSize: "1.5rem",
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ×
      </button>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "min(92vw, 640px)",
          maxHeight: "85vh",
          objectFit: "contain",
          borderRadius: "12px",
          background: "#fff",
          boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
          cursor: "default",
        }}
      />
    </div>,
    document.body,
  );
}