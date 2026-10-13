/**
 * ============================================================================
 * ApartmentCard.jsx
 * ============================================================================
 * THE SECOND BUG YOU DESCRIBED: "the full card should be a link... wherever
 * I click on the card, it will move to the next page."
 *
 * Fix: the whole <article> is now wrapped in a single <Link to={`/property/${id}`}>
 * (route confirmed from your Contracts.jsx: `to={`/property/${contract.property_id}`}`).
 * The wishlist star and share button still work normally — each one calls
 * event.preventDefault() + event.stopPropagation(), which stops the click
 * from ever reaching the surrounding <Link> and navigating away.
 *
 * FIELD NAMES: your real adapters.js wasn't included, so this reads several
 * possible field-name spellings defensively (camelCase and snake_case) so it
 * works whichever your adaptProperty() actually produces. If your adapter
 * uses different names than these fallbacks, just adjust the destructuring
 * below — everything else stays the same.
 *
 * LIFT ICON: your schema has no dedicated "has lift" column — lift/elevator
 * is one of the free-text strings in properties.facilities (same pattern
 * your own backend already uses for "balcony" in the has_balcony filter in
 * propertyController.js). So this card checks facilities for a "lift" or
 * "elevator" entry instead of a field that doesn't exist.
 * ============================================================================
 */

import { Link } from "react-router-dom";
import formatRelativeDate from "../utils/formatRelativeDate.js";

export default function ApartmentCard({ apartment, onToggleWishlist }) {
  const id = apartment.id ?? apartment.property_id;
  const photos = apartment.photos ?? [];
  const listedAt = apartment.createdAt ?? apartment.created_at ?? apartment.listedAt;
  const address = apartment.address ?? apartment.title ?? "Untitled listing";
  const pricePerMonth = apartment.pricePerMonth ?? apartment.rate ?? 0;
  const bedrooms = apartment.bedrooms ?? apartment.bedroom ?? "—";
  const bathrooms = apartment.bathrooms ?? apartment.bathroom ?? "—";
  const facilities = apartment.facilities ?? [];
  const hasLift = facilities.some((f) => /lift|elevator/i.test(f));
  const isWishlisted = Boolean(apartment.isWishlisted);

  const visiblePhotos = photos.slice(0, 3);
  const extraPhotoCount = Math.max(photos.length - 3, 0);
  const postDetailsUrl = `/property/${id}`;

  // --- Share handler: copies the post's link to the clipboard --------------
  function handleShare(event) {
    event.preventDefault();
    event.stopPropagation();
    const fullUrl = `${window.location.origin}${postDetailsUrl}`;

    if (navigator.share) {
      navigator.share({ title: address, url: fullUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(fullUrl);
      alert("Link copied to clipboard!");
    }
  }

  // --- Wishlist star handler -------------------------------------------------
  function handleWishlistClick(event) {
    event.preventDefault();
    event.stopPropagation();
    onToggleWishlist?.(id);
  }

  return (
    // ===================== WHOLE CARD IS NOW THE LINK =====================
    // Clicking anywhere on the card (photos, address, price, icon row)
    // navigates to /property/:id. The two buttons inside stop their click
    // from bubbling up to this Link, so they still work on their own.
    <Link to={postDetailsUrl} className="apartment-card" aria-label={`View details for ${address}`}>
      {/* ===================== 1. PHOTO GRID ===================== */}
      <div className="apartment-photos">
        {visiblePhotos.map((photoUrl, index) => {
          const isLastVisibleTile = index === visiblePhotos.length - 1;
          const showOverflowBadge = isLastVisibleTile && extraPhotoCount > 0;

          return (
            <div className="apartment-photo-tile" key={photoUrl + index}>
              <img src={photoUrl} alt={`${address} photo ${index + 1}`} />
              {/* --- "+N" overlay on the last visible tile when there are more photos --- */}
              {showOverflowBadge && <span className="apartment-photo-overflow">+{extraPhotoCount}</span>}
            </div>
          );
        })}
        {visiblePhotos.length === 0 && (
          <div className="apartment-photo-tile apartment-photo-placeholder">
            <span>No photos yet</span>
          </div>
        )}
      </div>

      <div className="apartment-card-body">
        {/* ===================== 2. LISTED DATE ===================== */}
        <p className="apartment-listed-date">{formatRelativeDate(listedAt)}</p>

        {/* ===================== 3. ADDRESS + PRICE ===================== */}
        <h3 className="apartment-address">{address}</h3>
        <p className="apartment-price">৳{Number(pricePerMonth).toLocaleString("en-BD")} / month</p>

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

          <button type="button" className="icon-btn share-btn" onClick={handleShare} aria-label="Share this listing">
            <img src="/assets/icons/share.svg" alt="" width="18" height="18" />
          </button>
        </div>
      </div>
    </Link>
  );
}
