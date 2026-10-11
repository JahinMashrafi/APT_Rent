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
 * You said "follow the design and formats of the given backend" — since no
 * backend was shared this pass, `fetchApartments()` below is a mock. Replace
 * its body with a real fetch call, e.g.:
 *
 *   const res = await fetch(
 *     `/api/apartments?page=${page}&${new URLSearchParams(filters)}`
 *   );
 *   const data = await res.json();
 *   return { items: data.items, totalPages: data.totalPages };
 *
 * and keep the same return shape ({ items, totalPages }) so nothing else
 * in this file needs to change.
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
  const data = await api.properties.search({ page, limit: POSTS_PER_PAGE, ...filters });
  return {
    items: (data?.data ?? []).map(adaptProperty),
    totalPages: data?.meta?.total_pages ?? 1,
  };
}
