import AppNavbar from "../components/AppNavbar.jsx";
import PropertyMap from "../components/PropertyMap.jsx";
import SearchFilterBar from "../components/SearchFilterBar.jsx";
import useAuth from "../hooks/useAuth.js";
import { useNavigate } from "react-router-dom";

/**
 * ============================================================================
 * Home.jsx
 * ============================================================================
 * Two completely different experiences live in this one page, switched by
 * auth state:
 *
 *   - LOGGED OUT -> original public hero (search-tag + map), unchanged.
 *   - LOGGED IN  -> AppNavbar + NewsFeed
 *                   (search/filter bar + apartment cards + pagination).
 *
 * Everything below the imports is grouped into clearly labeled sections so
 * you can jump straight to the part you want to edit.
 * ============================================================================
 */
export default function Home() {
  // isAuthenticated flips the whole page between the two experiences.
  // See src/hooks/useAuth.js — swap its internals for your real auth check.
  const { isLoading } = useAuth();
  const navigate = useNavigate();

    function handleSearch(filters) {
    const params = new URLSearchParams();
    const mappings = {
      searchText: "search",   // ← was "q"; now /browse?search=Gulshan
      city: "city",
      thana: "thana",
      postCode: "post_code",
      rooms: "bedroom",
      bathrooms: "bathroom",
      priceMin: "min_rate",
      priceMax: "max_rate",
    };

    Object.entries(mappings).forEach(([field, parameter]) => {
      const value = filters?.[field];
      const normalized = typeof value === "string" ? value.trim() : value;
      if (normalized) params.set(parameter, normalized);
    });
    if (filters?.hasBalcony && filters.hasBalcony !== "any") {
      params.set("has_balcony", filters.hasBalcony);
    }

    const query = params.toString();
    navigate(query ? `/browse?${query}` : "/browse");   // ← was /dashboard
  }

  // Avoid a flash of the wrong UI while we're still checking auth state.
  if (isLoading) {
    return <div className="page-shell page-loading" aria-busy="true" />;
  }

  // ==========================================================================
  // SECTION A — AUTHENTICATED HOME (post-login/register)
  // ==========================================================================

  // ==========================================================================
  // SECTION B — PUBLIC / LOGGED-OUT HOME (unchanged from your original code)
  // ==========================================================================
  return (
    <div className="page-shell">
      <AppNavbar />

      {/* HERO */}
      <main>
        <section className="hero">
          <div className="hero-media" aria-hidden="true">
            <img src="/assets/images/backgrounds/hero-background.svg" alt="" />
            <div className="hero-overlay"></div>
          </div>
          <div className="container hero-inner">
            <span className="eyebrow">
              Verified listings · Digital leases · Cashless rent
            </span>
            <h1>
              <em>Find Your Next Home</em>
            </h1>

            <SearchFilterBar onSearch={handleSearch} />
            <p className="hero-note">
              Sign in to unlock live listings, filters, and saved searches.
            </p>
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Explore Available Properties
          </h2>
          <PropertyMap />
        </section>
      </main>

      {/* FOOTER matching index.html */}
      <footer className="site-footer">
        <div className="container">
          <p>APT&nbsp;RENT // EST. 2026</p>
        </div>
      </footer>
    </div>
  );
}
