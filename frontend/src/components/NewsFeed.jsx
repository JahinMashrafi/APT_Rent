/**
 * ============================================================================
 * NewsFeed.jsx
 * ============================================================================
 * THE BUG YOU DESCRIBED ("have to click search bar to get the dashboard"):
 *
 *   Your version had:  const [activeFilters, setActiveFilters] = useState(null);
 *   and:                async function toApiFilters(filters = {}) { ... filters.searchText ... }
 *
 *   `filters = {}` is a DEFAULT PARAMETER — it only kicks in when the
 *   argument is `undefined`. On first render activeFilters is `null`
 *   (not undefined), so `toApiFilters(null)` runs with filters = null,
 *   and `filters.searchText` throws "Cannot read properties of null".
 *   That throw lands in the catch block in the effect below, which empties
 *   the list and shows the error — on EVERY load, before you ever touch
 *   the search bar. The moment you submit the search form, activeFilters
 *   becomes a real object `{ searchText, ... }`, the crash stops happening,
 *   and listings finally appear. That's the whole bug.
 *
 * THE FIX (two small changes, marked below):
 *   1. Initialize activeFilters as `{}` instead of `null`.
 *   2. Make toApiFilters defensive anyway (`filters || {}`), so this can
 *      never happen again even if something else passes null later.
 *
 * Everything else below is unchanged from what you already had — same API
 * wiring, same adaptProperty usage, same filter-name mapping.
 * ============================================================================
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchFilterBar from "./SearchFilterBar.jsx";
import ApartmentCard from "./ApartmentCard.jsx";
import Pagination from "./Pagination.jsx";
import api from "../services/api";
import { adaptProperty } from "../services/adapters";

const POSTS_PER_PAGE = 12;

export default function NewsFeed() {
  const [searchParams] = useSearchParams();
  const [apartments, setApartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --------------------------------------------------------------------
  // FIX #1: start as {} (an empty-but-real filter set), not null.
  // This is what makes listings show up immediately on page load,
  // without the user ever touching the search bar.
  // --------------------------------------------------------------------
  const [activeFilters, setActiveFilters] = useState(() => filtersFromSearchParams(searchParams));

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // --------------------------------------------------------------------------
  // Re-fetch whenever the page number or the applied filters change.
  // This now runs successfully on mount too, because activeFilters starts
  // as {} instead of null.
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isCancelled = false;

    async function loadApartments() {
      setIsLoading(true);
      setLoadError("");
      try {
        const { items, totalPages: pages } = await fetchApartments(currentPage, activeFilters);
        if (!isCancelled) {
          setApartments(items);
          setTotalPages(pages);
        }
      } catch (error) {
        if (!isCancelled) {
          setApartments([]);
          setTotalPages(1);
          setLoadError(error.message || "Could not load listings.");
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadApartments();
    return () => {
      isCancelled = true;
    };
  }, [currentPage, activeFilters]);

  // --- New search/filter submission always resets back to page 1 -----------
  const handleSearch = useCallback((filters) => {
    setActiveFilters(filters || {});
    setCurrentPage(1);
  }, []);

  // --- Optimistic wishlist toggle --------------------------------------------
  // NOTE: your schema (the one you pasted) has no wishlist table yet, so
  // this only toggles local UI state for now — it is not saved anywhere.
  // If you want it to persist, you'd add something like:
  //   CREATE TABLE wishlists (user_id int REFERENCES users, property_id int REFERENCES properties, PRIMARY KEY (user_id, property_id));
  // plus POST/DELETE /wishlist/:propertyId endpoints. Flagging this rather
  // than silently inventing a table your backend doesn't have.
  function handleToggleWishlist(apartmentId) {
    setApartments((prev) =>
      prev.map((apt) => (apt.id === apartmentId ? { ...apt, isWishlisted: !apt.isWishlisted } : apt))
    );
  }

  return (
    <section className="newsfeed-section">
      {/* ===================== SEARCH + FILTER BAR ===================== */}
      <SearchFilterBar
        onSearch={handleSearch}
        liveSearch
        initialFilters={filtersFromSearchParams(searchParams)}
      />

      {/* ===================== APARTMENT POSTS GRID ===================== */}
      {isLoading ? (
        <p className="newsfeed-status">Loading listings…</p>
      ) : loadError ? (
        <p className="newsfeed-status">{loadError}</p>
      ) : apartments.length === 0 ? (
        <p className="newsfeed-status">No apartments match your search yet.</p>
      ) : (
        <div className="newsfeed-grid">
          {apartments.map((apartment) => (
            <ApartmentCard key={apartment.id} apartment={apartment} onToggleWishlist={handleToggleWishlist} />
          ))}
        </div>
      )}

      {/* ===================== PAGE FOOTER / PAGINATION ===================== */}
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </section>
  );
}

async function fetchApartments(page, filters) {
  const data = await api.properties.search({
    page,
    limit: POSTS_PER_PAGE,
    ...toApiFilters(filters),
  });
  return {
    items: (data?.data ?? []).map(adaptProperty),
    totalPages: data?.meta?.total_pages ?? 1,
  };
}

// --------------------------------------------------------------------------
// FIX #2: defensive fallback. Even though NewsFeed now always passes a
// real object, this function no longer trusts that blindly — `filters || {}`
// means a stray `null`/`undefined` from anywhere else that calls this can
// never reproduce the original crash.
// --------------------------------------------------------------------------
function toApiFilters(filters) {
  const source = filters || {};
  const apiFilters = {};
  const values = {
    q: source.searchText,
    city: source.city,
    thana: source.thana,
    post_code: source.postCode,
    bedroom: source.rooms,
    bathroom: source.bathrooms,
    min_rate: source.priceMin,
    max_rate: source.priceMax,
  };

  for (const [name, value] of Object.entries(values)) {
    if (typeof value === "string" ? value.trim() !== "" : value != null) {
      apiFilters[name] = typeof value === "string" ? value.trim() : value;
    }
  }

  if (source.hasBalcony && source.hasBalcony !== "any") {
    apiFilters.has_balcony = source.hasBalcony;
  }

  return apiFilters;
}

function filtersFromSearchParams(params) {
  if (!params) return {};
  return {
    searchText: params.get("q") || "",
    city: params.get("city") || "",
    thana: params.get("thana") || "",
    postCode: params.get("post_code") || "",
    rooms: params.get("bedroom") || "",
    bathrooms: params.get("bathroom") || "",
    hasBalcony: params.get("has_balcony") || "any",
    priceMin: params.get("min_rate") || "",
    priceMax: params.get("max_rate") || "",
  };
}
