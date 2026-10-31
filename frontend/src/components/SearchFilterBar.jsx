/**
 * ============================================================================
 * SearchFilterBar.jsx
 * ============================================================================
 * Sits above the newsfeed. Contains:
 *   - A search input (left)
 *   - A single "Filter" button right beside it that opens a popover with:
 *       Location:   City, Thana, Post code
 *       House type: Room, Bathroom, Balcony (counts)
 *       Price range: Min - Max
 *
 * This component is "controlled from the outside": it doesn't fetch data
 * itself. It just collects the search text + filter values and reports
 * them upward via onSearch(filters), so <NewsFeed /> decides what to do
 * with them (e.g. call the API).
 * ============================================================================
 */

import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const EMPTY_FILTERS = {
  city: "",
  thana: "",
  postCode: "",
  rooms: "",
  bathrooms: "",
  hasBalcony: "any", // "any" | "yes" | "no"
  priceMin: "",
  priceMax: "",
};

export default function SearchFilterBar({
  onSearch,
  liveSearch = false,
  initialFilters = EMPTY_FILTERS,
}) {
  const { t } = useLanguage();

  const { searchText: initialSearchText = "", ...initialRest } =
    initialFilters;

  const [searchText, setSearchText] = useState(initialSearchText);
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    ...initialRest,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterWrapperRef = useRef(null);
  const skipInitialLiveSearch = useRef(true);

  // Close the popover when the user interacts anywhere outside the filter
  // button/panel. Pointer events cover mouse, touch, and pen input. Because
  // the toggle lives inside the wrapper, clicking it again still toggles it
  // closed through its own onClick handler.
  useEffect(() => {
    if (!isFilterOpen) return undefined;

    function handleOutsidePointerDown(event) {
      if (!filterWrapperRef.current?.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isFilterOpen]);

  // Keep the input in sync when the URL changes from outside.
  // For example: Home hero -> /browse?search=Gulshan, or browser back/forward.
  const incomingKey = JSON.stringify(initialFilters);

  useEffect(() => {
    const {
      searchText: incomingText = "",
      ...incomingRest
    } = JSON.parse(incomingKey);

    setSearchText((prev) =>
      prev === incomingText ? prev : incomingText
    );

    setFilters((prev) => {
      const next = { ...EMPTY_FILTERS, ...incomingRest };

      return JSON.stringify(prev) === JSON.stringify(next)
        ? prev
        : next;
    });
  }, [incomingKey]);

  // Live filtering (debounced 300ms).
  useEffect(() => {
    if (!liveSearch) return undefined;

    if (skipInitialLiveSearch.current) {
      skipInitialLiveSearch.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      onSearch?.({ searchText, ...filters });
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, liveSearch, onSearch, searchText]);
  

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  // Search button / Enter key.
  function handleSubmit(event) {
    event.preventDefault();
    onSearch?.({ searchText: searchText.trim(), ...filters });
    setIsFilterOpen(false);
  }

  // Clear button inside the search input.
  function handleClearSearch() {
    setSearchText("");
    onSearch?.({ searchText: "", ...filters });
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
    setSearchText("");
    onSearch?.({ searchText: "", ...EMPTY_FILTERS });
    setIsFilterOpen(false);
  }

  return (
    <form
      className="newsfeed-search-bar"
      role="search"
      aria-label={t("search.formAria")}
      onSubmit={handleSubmit}
    >
      {/* ===================== SEARCH INPUT (left) ===================== */}
      <div className="search-tag newsfeed-search-input">
        <span className="search-icon">
          <Search size={16} aria-hidden="true" />
        </span>

        <span className="search-tag-seam" aria-hidden="true"></span>

        <input
          type="search"
          placeholder={t("search.placeholder")}
          aria-label={t("search.inputAria")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        {searchText && (
          <button
            type="button"
            className="search-clear-btn"
            aria-label={t("search.clearAria")}
            onClick={handleClearSearch}
          >
            ×
          </button>
        )}

        <button type="submit" className="btn btn-primary">
          {t("search.button")}
        </button>
      </div>

      {/* ================= FILTER BUTTON (beside search) ================= */}
      <div
        ref={filterWrapperRef}
        className={`newsfeed-filter-wrapper${isFilterOpen ? " is-open" : ""}`}
      >
        <button
          type="button"
          className="btn btn-outline newsfeed-filter-toggle"
          aria-haspopup="true"
          aria-expanded={isFilterOpen}
          onClick={() => setIsFilterOpen((prev) => !prev)}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          {t("search.filter")}
        </button>

        {/* ---------------- FILTER POPOVER PANEL ---------------- */}
        {isFilterOpen && (
          <div className="newsfeed-filter-panel">
            {/* --- Location: City, Thana, Post code --- */}
            <fieldset className="filter-group">
              <legend>{t("search.location")}</legend>

              <input
                type="text"
                placeholder={t("search.city")}
                value={filters.city}
                onChange={(e) =>
                  updateFilter("city", e.target.value)
                }
              />

              <input
                type="text"
                placeholder={t("search.thana")}
                value={filters.thana}
                onChange={(e) =>
                  updateFilter("thana", e.target.value)
                }
              />

              <input
                type="text"
                placeholder={t("search.postCode")}
                value={filters.postCode}
                onChange={(e) =>
                  updateFilter("postCode", e.target.value)
                }
              />
            </fieldset>

            {/* --- House type: Room, Bathroom, Balcony --- */}
            <fieldset className="filter-group">
              <legend>{t("search.houseType")}</legend>

              <label className="filter-field">
                {t("search.rooms")}
                <input
                  type="number"
                  min="0"
                  placeholder={t("common.any")}
                  value={filters.rooms}
                  onChange={(e) =>
                    updateFilter("rooms", e.target.value)
                  }
                />
              </label>

              <label className="filter-field">
                {t("search.bathrooms")}
                <input
                  type="number"
                  min="0"
                  placeholder={t("common.any")}
                  value={filters.bathrooms}
                  onChange={(e) =>
                    updateFilter("bathrooms", e.target.value)
                  }
                />
              </label>

              <label className="filter-field">
                {t("search.balcony")}
                <select
                  value={filters.hasBalcony}
                  onChange={(e) =>
                    updateFilter("hasBalcony", e.target.value)
                  }
                >
                  <option value="any">{t("common.any")}</option>
                  <option value="yes">{t("common.yes")}</option>
                  <option value="no">{t("common.no")}</option>
                </select>
              </label>
            </fieldset>

            {/* --- Price range: Min to Max --- */}
            <fieldset className="filter-group">
              <legend>{t("search.priceRange")}</legend>

              <input
                type="number"
                min="0"
                placeholder={t("search.min")}
                value={filters.priceMin}
                onChange={(e) =>
                  updateFilter("priceMin", e.target.value)
                }
              />

              <span className="filter-range-separator">
                {t("search.to")}
              </span>

              <input
                type="number"
                min="0"
                placeholder={t("search.max")}
                value={filters.priceMax}
                onChange={(e) =>
                  updateFilter("priceMax", e.target.value)
                }
              />
            </fieldset>

            {/* --- Panel actions --- */}
            <div className="filter-panel-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleClearFilters}
              >
                {t("search.clearFilters")}
              </button>

              <button
                type="submit"
                className="btn btn-primary"
              >
                {t("search.applyFilters")}
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}