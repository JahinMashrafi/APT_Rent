import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchFilterBar from "./SearchFilterBar.jsx";
import ApartmentCard from "./ApartmentCard.jsx";
import Pagination from "./Pagination.jsx";
import api from "../services/api";
import { adaptProperty } from "../services/adapters";

const POSTS_PER_PAGE = 12;

// filter field  ->  URL param
const URL_PARAMS = {
  searchText: "search",
  city: "city",
  thana: "thana",
  postCode: "post_code",
  rooms: "bedroom",
  bathrooms: "bathroom",
  priceMin: "min_rate",
  priceMax: "max_rate",
};

export default function NewsFeed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [apartments, setApartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // The URL is the source of truth. Whenever it changes (typing, Home hero
  // redirect, back/forward) the filters are re-derived from it.
  const urlKey = searchParams.toString();
  const activeFilters = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(urlKey)),
    [urlKey]
  );

  // New search/filter -> back to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [urlKey]);

  // Fetch whenever page or filters change
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

  // Search / Enter / live typing / clear all end up here -> update the URL.
  const handleSearch = useCallback(
    (filters) => {
      const next = new URLSearchParams();
      Object.entries(URL_PARAMS).forEach(([field, param]) => {
        const value = filters?.[field];
        const normalized = typeof value === "string" ? value.trim() : value;
        if (normalized) next.set(param, normalized);
      });
      if (filters?.hasBalcony && filters.hasBalcony !== "any") {
        next.set("has_balcony", filters.hasBalcony);
      }
      // replace: live typing should not fill the browser history
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  function handleToggleWishlist(apartmentId) {
    setApartments((prev) =>
      prev.map((apt) => (apt.id === apartmentId ? { ...apt, isWishlisted: !apt.isWishlisted } : apt))
    );
  }

  return (
    <section className="newsfeed-section">
      <SearchFilterBar onSearch={handleSearch} liveSearch initialFilters={activeFilters} />


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

  return {
    // accepts ?search=, and the older ?q= / ?location= as fallbacks
    searchText: params.get("search") || params.get("q") || params.get("location") || "",
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
