import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "../../css/modules.css";

// =============================================================================
// ImageSlider.jsx — Scroll-snap image gallery using original APT Rent theme
// =============================================================================

export default function ImageSlider({ images = [], title = "Property" }) {
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  function scrollTo(index) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: scrollRef.current.clientWidth * index, behavior: "smooth" });
    setCurrentIndex(index);
  }

  function handleScroll() {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
    setCurrentIndex(idx);
  }

  if (!images.length) {
    return (
      <div className="img-slider" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#8a8f85", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>No images available</span>
      </div>
    );
  }

  return (
    <div className="img-slider" style={{ position: "relative" }}>
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: "flex",
          height: "100%",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {images.map((src, i) => (
          <div key={i} style={{ flexShrink: 0, width: "100%", height: "100%", scrollSnapAlign: "start" }}>
            <img
              src={src}
              alt={`${title} — view ${i + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ))}
      </div>

      {/* Count badge */}
      <div style={{
        position: "absolute", top: "14px", right: "14px",
        background: "rgba(27,42,65,0.72)", backdropFilter: "blur(4px)",
        color: "var(--color-on-ink)", borderRadius: "var(--radius-pill)",
        padding: "3px 10px", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: "600",
        pointerEvents: "none",
      }}>
        {currentIndex + 1} / {images.length}
      </div>

      {/* Prev arrow */}
      {currentIndex > 0 && (
        <button
          onClick={() => scrollTo(currentIndex - 1)}
          aria-label="Previous image"
          style={{
            position: "absolute", top: "50%", left: "14px", transform: "translateY(-50%)",
            background: "rgba(247,245,239,0.9)", border: "none", borderRadius: "50%",
            width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "var(--shadow-soft)", color: "var(--color-text-strong)",
          }}
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Next arrow */}
      {currentIndex < images.length - 1 && (
        <button
          onClick={() => scrollTo(currentIndex + 1)}
          aria-label="Next image"
          style={{
            position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)",
            background: "rgba(247,245,239,0.9)", border: "none", borderRadius: "50%",
            width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "var(--shadow-soft)", color: "var(--color-text-strong)",
          }}
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: "14px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Go to image ${i + 1}`}
              style={{
                width: i === currentIndex ? "20px" : "8px",
                height: "8px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: i === currentIndex ? "var(--color-brass)" : "rgba(247,245,239,0.6)",
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}