/**
 * ============================================================================
 * NewsFeed.jsx
 * ============================================================================
 * The middle section of the authenticated Home page.
 *
 * Responsibilities:
 *   1. Owns the current page number + filters state
 *   2. Fetches apartment posts for rent from the real API
 *   3. Renders: <SearchFilterBar /> -> grid of <ApartmentCard /> -> <Pagination />
 *
 * Search and filter values are translated to the backend's query parameter
 * names in fetchApartments(), keeping the form's UI-facing shape separate
 * from the API contract.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import SearchFilterBar from "./SearchFilterBar.jsx";
import ApartmentCard from "./ApartmentCard.jsx";
import Pagination from "./Pagination.jsx";
import api from "../services/api";
import { adaptProperty } from "../services/adapters";

const POSTS_PER_PAGE = 9;

export default function NewsFeed() {
  const [apartments, setApartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilters, setActiveFilters] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // --------------------------------------------------------------------------
  // Re-fetch whenever the page number or the applied filters change.
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
  function handleSearch(filters) {
    setActiveFilters(filters);
    setCurrentPage(1);
  }

  // --- Optimistic wishlist toggle (swap the TODO for a real API call) ------
  function handleToggleWishlist(apartmentId) {
    setApartments((prev) =>
      prev.map((apt) =>
        apt.id === apartmentId ? { ...apt, isWishlisted: !apt.isWishlisted } : apt
      )
    );
    // TODO: fire the real API call here, e.g.
    // fetch(`/api/wishlist/${apartmentId}`, { method: "POST" });
  }

  return (
    <section className="newsfeed-section">
      {/* ===================== SEARCH + FILTER BAR ===================== */}
      <SearchFilterBar onSearch={handleSearch} />

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
            <ApartmentCard
              key={apartment.id}
              apartment={apartment}
              onToggleWishlist={handleToggleWishlist}
            />
          ))}
        </div>
      )}

      {/* ===================== PAGE FOOTER / PAGINATION ===================== */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
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

function toApiFilters(filters = {}) {
  const apiFilters = {};
  const values = {
    q: filters.searchText,
    city: filters.city,
    thana: filters.thana,
    post_code: filters.postCode,
    bedroom: filters.rooms,
    bathroom: filters.bathrooms,
    min_rate: filters.priceMin,
    max_rate: filters.priceMax,
  };

  for (const [name, value] of Object.entries(values)) {
    if (typeof value === "string" ? value.trim() !== "" : value != null) {
      apiFilters[name] = typeof value === "string" ? value.trim() : value;
    }
  }

  if (filters.hasBalcony && filters.hasBalcony !== "any") {
    apiFilters.has_balcony = filters.hasBalcony;
  }

  return apiFilters;
}
