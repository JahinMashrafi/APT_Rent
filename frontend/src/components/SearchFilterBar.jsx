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

import { useState } from "react";

// Shape of an "empty" filter set — kept in one place so it's easy to extend.
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

export default function SearchFilterBar({ onSearch }) {
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // --- Generic handler for all filter form fields ---------------------------
  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  // --- Fired when the search form is submitted (search icon / Enter) -------
  function handleSubmit(event) {
    event.preventDefault();
    onSearch?.({ searchText, ...filters });
    setIsFilterOpen(false);
  }

  // --- "Clear filters" convenience action -----------------------------------
  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  return (
    <form
      className="newsfeed-search-bar"
      role="search"
      aria-label="Search and filter apartments"
      onSubmit={handleSubmit}
    >
      {/* ===================== SEARCH INPUT (left) ===================== */}
      <div className="search-tag newsfeed-search-input">
        <span className="search-icon">
          <img src="/assets/icons/search.svg" alt="" width="16" height="16" />
        </span>
        <span className="search-tag-seam" aria-hidden="true"></span>
        <input
          type="search"
          placeholder="Search by area, e.g. Gulshan, Dhanmondi..."
          aria-label="Search apartments by area"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </div>

      {/* ================= FILTER BUTTON (beside search) ================= */}
      <div className="newsfeed-filter-wrapper">
        <button
          type="button"
          className="btn btn-outline newsfeed-filter-toggle"
          aria-haspopup="true"
          aria-expanded={isFilterOpen}
          onClick={() => setIsFilterOpen((prev) => !prev)}
        >
          <img src="/assets/icons/filter.svg" alt="" width="16" height="16" />
          Filter
        </button>

        {/* ---------------- FILTER POPOVER PANEL ---------------- */}
        {isFilterOpen && (
          <div className="newsfeed-filter-panel">
            {/* --- Location: City, Thana, Post code --- */}
            <fieldset className="filter-group">
              <legend>Location</legend>
              <input
                type="text"
                placeholder="City"
                value={filters.city}
                onChange={(e) => updateFilter("city", e.target.value)}
              />
              <input
                type="text"
                placeholder="Thana"
                value={filters.thana}
                onChange={(e) => updateFilter("thana", e.target.value)}
              />
              <input
                type="text"
                placeholder="Post code"
                value={filters.postCode}
                onChange={(e) => updateFilter("postCode", e.target.value)}
              />
            </fieldset>

            {/* --- House type: Room, Bathroom, Balcony --- */}
            <fieldset className="filter-group">
              <legend>House type</legend>

              <label className="filter-field">
                Room(s)
                <input
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={filters.rooms}
                  onChange={(e) => updateFilter("rooms", e.target.value)}
                />
              </label>

              <label className="filter-field">
                Bathroom(s)
                <input
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={filters.bathrooms}
                  onChange={(e) => updateFilter("bathrooms", e.target.value)}
                />
              </label>

              <label className="filter-field">
                Balcony
                <select
                  value={filters.hasBalcony}
                  onChange={(e) => updateFilter("hasBalcony", e.target.value)}
                >
                  <option value="any">Any</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </fieldset>

            {/* --- Price range: Min to Max --- */}
            <fieldset className="filter-group">
              <legend>Price range (BDT / month)</legend>
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={filters.priceMin}
                onChange={(e) => updateFilter("priceMin", e.target.value)}
              />
              <span className="filter-range-separator">to</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={filters.priceMax}
                onChange={(e) => updateFilter("priceMax", e.target.value)}
              />
            </fieldset>

            {/* --- Panel actions --- */}
            <div className="filter-panel-actions">
              <button type="button" className="btn btn-ghost" onClick={handleClearFilters}>
                Clear
              </button>
              <button type="submit" className="btn btn-primary">
                Apply filters
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
