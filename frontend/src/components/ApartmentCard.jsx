/**
 * ============================================================================
 * ApartmentCard.jsx
 * ============================================================================
 * Renders ONE apartment post in the newsfeed. Expects an `apartment` object
 * shaped like this (adjust the field names to match your real API response
 * — this is the only place you'd need to touch for a field-name mismatch):
 *
 *   {
 *     id: "abc123",
 *     photos: ["/img1.jpg", "/img2.jpg", "/img3.jpg", "/img4.jpg", ...],
 *     listedAt: "2026-08-01T00:00:00Z",
 *     address: "House 12, Road 5, Dhanmondi, Dhaka",
 *     pricePerMonth: 25000,
 *     bedrooms: 3,
 *     bathrooms: 2,
 *     hasLift: true,
 *     isWishlisted: false,
 *   }
 *
 * Sections inside this card (top to bottom):
 *   1. Photo grid (first 3 photos, "+N" overlay for the rest)
 *   2. Meta row (listed date)
 *   3. Address + price
 *   4. Icon row (bedrooms, bathrooms, lift)
 *   5. Action row (wishlist star, share)
 * ============================================================================
 */

import { Link } from "react-router-dom"; // TODO: swap for next/link if this is a Next.js project
import formatRelativeDate from "../utils/formatRelativeDate.js";

export default function ApartmentCard({ apartment, onToggleWishlist }) {
  const {
    id,
    photos = [],
    listedAt,
    address,
    pricePerMonth,
    bedrooms,
    bathrooms,
    hasLift,
    isWishlisted,
  } = apartment;

  const visiblePhotos = photos.slice(0, 3);
  const extraPhotoCount = Math.max(photos.length - 3, 0);
  const postDetailsUrl = `/property/${id}`;

  // --- Share handler: copies the post's link to the clipboard --------------
  function handleShare(event) {
    event.preventDefault();
    event.stopPropagation();
    const fullUrl = `${window.location.origin}${postDetailsUrl}`;

    if (navigator.share) {
      // Native share sheet on supported (mostly mobile) browsers
      navigator.share({ title: address, url: fullUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(fullUrl);
      // TODO: swap this for a proper toast/snackbar component if you have one
      alert("Link copied to clipboard!");
    }
  }

  // --- Wishlist star handler -------------------------------------------------
  function handleWishlistClick(event) {
    event.preventDefault();
    event.stopPropagation();
    onToggleWishlist?.(id); // Parent (NewsFeed) owns the actual API call / state
  }

  return (
    <article className="apartment-card">
      {/* ===================== 1. PHOTO GRID ===================== */}
      <Link to={postDetailsUrl} className="apartment-photos" aria-label={`View details for ${address}`}>
        {visiblePhotos.map((photoUrl, index) => {
          const isLastVisibleTile = index === visiblePhotos.length - 1;
          const showOverflowBadge = isLastVisibleTile && extraPhotoCount > 0;

          return (
            <div className="apartment-photo-tile" key={photoUrl + index}>
              <img
                src={photoUrl}
                alt={`${address} photo ${index + 1}`}
                onError={(event) => {
                  event.currentTarget.src = "/assets/images/backgrounds/hero-background.svg";
                }}
              />
              {/* --- "+N" overlay on the last visible tile when there are more photos --- */}
              {showOverflowBadge && (
                <span className="apartment-photo-overflow">+{extraPhotoCount}</span>
              )}
            </div>
          );
        })}
      </Link>

      <div className="apartment-card-body">
        {/* ===================== 2. LISTED DATE ===================== */}
        <p className="apartment-listed-date">{formatRelativeDate(listedAt)}</p>

        {/* ===================== 3. ADDRESS + PRICE ===================== */}
        <h3 className="apartment-address">{address}</h3>
        <p className="apartment-price">৳{pricePerMonth?.toLocaleString("en-BD")} / month</p>

        {/* ===================== 4. ICON ROW (bed / bath / lift) ===================== */}
        <ul className="apartment-icon-row">
          <li>
            <img src="/assets/icons/bed.svg" alt="Bedrooms" width="16" height="16" />
            <span>{bedrooms}</span>
          </li>
          <li>
            <img src="/assets/icons/bath.svg" alt="Bathrooms" width="16" height="16" />
            <span>{bathrooms}</span>
          </li>
          <li>
            <img src="/assets/icons/lift.svg" alt="Lift" width="16" height="16" />
            <span>{hasLift ? "Yes" : "No"}</span>
          </li>
        </ul>

        {/* ===================== 5. ACTIONS (wishlist / share) ===================== */}
        <div className="apartment-actions">
          <button
            type="button"
            className={`icon-btn wishlist-btn ${isWishlisted ? "is-active" : ""}`}
            onClick={handleWishlistClick}
            aria-pressed={isWishlisted}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <img src="/assets/icons/star.svg" alt="" width="18" height="18" />
          </button>

          <button
            type="button"
            className="icon-btn share-btn"
            onClick={handleShare}
            aria-label="Share this listing"
          >
            <img src="/assets/icons/share.svg" alt="" width="18" height="18" />
          </button>
        </div>
      </div>
    </article>
  );
}
