

import { Link } from "react-router-dom";

import { BedDouble, Bath, ArrowUpDown, Share2 } from "lucide-react";

import formatRelativeDate from "../utils/formatRelativeDate.js";
import { useToast } from "./ui/Toast.jsx";

// Clipboard API needs HTTPS/localhost; this fallback covers plain-http and older browsers.
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to the legacy method */
    }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function ApartmentCard({ apartment }) {
  const { showToast } = useToast();

  const id = apartment.id ?? apartment.property_id;
  const photos = apartment.photos ?? [];
  const listedAt = apartment.listedAt ?? apartment.createdAt ?? apartment.created_at;
  const address = apartment.address ?? apartment.title ?? "Untitled listing";
  const pricePerMonth = apartment.pricePerMonth ?? apartment.rate ?? 0;
  const bedrooms = apartment.bedrooms ?? apartment.bedroom ?? "—";
  const bathrooms = apartment.bathrooms ?? apartment.bathroom ?? "—";

  // adaptProperty() already computes hasLift; fall back to scanning the
  // amenities/facilities list for raw API data.
  const amenityList = apartment.amenities ?? apartment.facilities ?? [];
  const hasLift =
    apartment.hasLift ?? amenityList.some((f) => /lift|elevator/i.test(f));

  const visiblePhotos = photos.slice(0, 3);
  const extraPhotoCount = Math.max(photos.length - 3, 0);
  const postDetailsUrl = `/property/${id}`;

  async function handleShare(event) {
    // The whole card is a <Link>; stop the click from navigating.
    event.preventDefault();
    event.stopPropagation();

    const fullUrl = `${window.location.origin}/property/${id}`;

    // On phones/tablets, open the native share sheet when available.
    const isTouch = window.matchMedia?.("(pointer: coarse)").matches;
    if (isTouch && navigator.share) {
      try {
        await navigator.share({ title: address, url: fullUrl });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // user closed the sheet
        // any other failure: fall back to copying below
      }
    }

    const copied = await copyText(fullUrl);
    showToast(
      copied
        ? { message: "Property link copied to clipboard!", type: "success" }
        : { message: "Couldn't copy the link. Please copy it from the address bar.", type: "error" },
    );
  }

  return (
  
    <Link to={postDetailsUrl} className="apartment-card" aria-label={`View details for ${address}`}>
      {/* ===================== PHOTO GRID ===================== */}
      <div className="apartment-photos">
        {visiblePhotos.map((photoUrl, index) => {
          const isLastVisibleTile = index === visiblePhotos.length - 1;
          const showOverflowBadge = isLastVisibleTile && extraPhotoCount > 0;

          return (
            <div className="apartment-photo-tile" key={photoUrl + index}>
              <img src={photoUrl} alt={`${address} photo ${index + 1}`} />

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

        <p className="apartment-listed-date">{formatRelativeDate(listedAt)}</p>


        <h3 className="apartment-address">{address}</h3>

        <p className="apartment-price">৳{Number(pricePerMonth).toLocaleString("en-BD")} / month</p>

        {/* ===================== META ROW (bed / bath / lift) ===================== */}
        <ul className="apartment-icon-row">
          <li title="Bedrooms">
            <BedDouble size={18} aria-hidden="true" />
            <span className="meta-value">{bedrooms}</span>
            <span className="meta-label">Bed</span>
          </li>
          <li title="Bathrooms">
            <Bath size={18} aria-hidden="true" />
            <span className="meta-value">{bathrooms}</span>
            <span className="meta-label">Bath</span>
          </li>
          <li title="Lift" className={hasLift ? "" : "is-muted"}>
            <ArrowUpDown size={18} aria-hidden="true" />
            <span className="meta-value">{hasLift ? "Yes" : "No"}</span>
            <span className="meta-label">Lift</span>
          </li>
        </ul>

        {/* ===================== SHARE BUTTON ===================== */}
        <div className="apartment-actions">
          <button type="button" className="share-btn" onClick={handleShare} aria-label="Share this listing">
            <Share2 size={16} aria-hidden="true" />
            Share
          </button>
        </div>
      </div>
    </Link>
  );
}
