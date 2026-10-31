
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchFilterBar from "./SearchFilterBar.jsx";
import ApartmentCard from "./ApartmentCard.jsx";
import Pagination from "./Pagination.jsx";
import api from "../services/api";
import { adaptProperty } from "../services/adapters";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useAddressTranslations } from "../hooks/useAddressTranslations.js";

const POSTS_PER_PAGE = 12;

// Filter field -> URL param
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
  const { t, lang } = useLanguage();

  const [searchParams, setSearchParams] = useSearchParams();

  const [apartments, setApartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Collect only apartment addresses for translation.
  // Collect apartment addresses or titles for translation.
  const addressesToTranslate = useMemo(
    () =>
      apartments
        .map((apartment) => {
          const address =
            typeof apartment.address === "string"
              ? apartment.address.trim()
              : "";

          const title =
            typeof apartment.title === "string"
              ? apartment.title.trim()
              : "";

          return address || title;
        })
        .filter(Boolean),
    [apartments]
  );
  // Translate only when Bangla is selected.
  const addressTranslations = useAddressTranslations(
    addressesToTranslate,
    lang === "bn"
  );

  // The URL is the source of truth.
  const urlKey = searchParams.toString();

  const activeFilters = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(urlKey)),
    [urlKey]
  );

  // New search/filter -> back to page 1.
  useEffect(() => {
    setCurrentPage(1);
  }, [urlKey]);

  // Fetch apartments whenever page or filters change.
  useEffect(() => {
    let isCancelled = false;

    async function loadApartments() {
      setIsLoading(true);
      setLoadError("");

      try {
        const { items, totalPages: pages } = await fetchApartments(
          currentPage,
          activeFilters
        );

        if (!isCancelled) {
          setApartments(items);
          setTotalPages(pages);
        }
      } catch (error) {
        if (!isCancelled) {
          setApartments([]);
          setTotalPages(1);
          setLoadError(error.message || "__load_error__");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadApartments();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, activeFilters]);

  // Search / Enter / live typing / clear all.
  const handleSearch = useCallback(
    (filters) => {
      const next = new URLSearchParams();

      Object.entries(URL_PARAMS).forEach(([field, param]) => {
        const value = filters?.[field];
        const normalized =
          typeof value === "string" ? value.trim() : value;

        if (normalized) {
          next.set(param, normalized);
        }
      });

      if (filters?.hasBalcony && filters.hasBalcony !== "any") {
        next.set("has_balcony", filters.hasBalcony);
      }

      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  function handleToggleWishlist(apartmentId) {
    setApartments((prev) =>
      prev.map((apt) =>
        apt.id === apartmentId
          ? { ...apt, isWishlisted: !apt.isWishlisted }
          : apt
      )
    );
  }

  return (
    <section className="newsfeed-section">
      <SearchFilterBar
        onSearch={handleSearch}
        liveSearch
        initialFilters={activeFilters}
      />

      {isLoading ? (
        <p className="newsfeed-status">{t("feed.loading")}</p>
      ) : loadError ? (
        <p className="newsfeed-status">
          {loadError === "__load_error__"
            ? t("feed.loadError")
            : loadError}
        </p>
      ) : apartments.length === 0 ? (
        <p className="newsfeed-status">{t("feed.empty")}</p>
      ) : (
        <div className="newsfeed-grid">
          {apartments.map((apartment) => {
            const originalAddress =
              (typeof apartment.address === "string"
                ? apartment.address.trim()
                : "") ||
              (typeof apartment.title === "string"
                ? apartment.title.trim()
                : "");

            return (
              <ApartmentCard
                key={apartment.id}
                apartment={apartment}
                translatedAddress={
                  lang === "bn"
                    ? addressTranslations[originalAddress]
                    : undefined
                }
                onToggleWishlist={handleToggleWishlist}
              />
            );
          })}
        </div>
      )}

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
    if (
      typeof value === "string"
        ? value.trim() !== ""
        : value != null
    ) {
      apiFilters[name] =
        typeof value === "string" ? value.trim() : value;
    }
  }

  if (source.hasBalcony && source.hasBalcony !== "any") {
    apiFilters.has_balcony = source.hasBalcony;
  }

  return apiFilters;
}

function filtersFromSearchParams(params) {
  return {
    // Accepts ?search= and older ?q= / ?location= fallbacks.
    searchText:
      params.get("search") ||
      params.get("q") ||
      params.get("location") ||
      "",
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
