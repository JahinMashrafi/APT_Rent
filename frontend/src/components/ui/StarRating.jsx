import { Star } from "lucide-react";

// =============================================================================
// StarRating.jsx — Reusable star rating display
// =============================================================================
// Props:
//   rating: number  (0–5, supports decimals)
//   maxStars: number  (default: 5)
//   interactive: boolean  (if true, renders clickable stars)
//   onChange: (rating: number) => void  (only used when interactive=true)
//   size: "sm" | "md" | "lg"  (default: "md")
//   showValue: boolean  (show numeric value next to stars)
//   totalReviews: number  (show "(N reviews)" next to stars)
// =============================================================================

const starSizes = {
  sm: 12,
  md: 16,
  lg: 20,
};

export default function StarRating({
  rating = 0,
  maxStars = 5,
  interactive = false,
  onChange,
  size = "md",
  showValue = false,
  totalReviews,
}) {
  const starSize = starSizes[size];

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.floor(rating);
        const partial = !filled && i < rating;
        const value = i + 1;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(value)}
            className={`relative ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}`}
            aria-label={interactive ? `Rate ${value} out of ${maxStars}` : undefined}
          >
            {/* Full or empty star */}
            <Star
              size={starSize}
              className={
                filled
                  ? "fill-amber-400 text-amber-400"
                  : partial
                  ? "fill-amber-200 text-amber-400"
                  : "fill-none text-slate-300"
              }
            />
          </button>
        );
      })}

      {showValue && (
        <span className="text-sm font-semibold text-slate-700 ml-1">
          {rating.toFixed(1)}
        </span>
      )}

      {totalReviews != null && (
        <span className="text-sm text-slate-500 ml-0.5">
          ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
        </span>
      )}
    </div>
  );
}
