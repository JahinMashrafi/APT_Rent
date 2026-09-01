import Navbar from "../components/Navbar.jsx";
import PropertyMap from "../components/PropertyMap.jsx";
import AuthNavbar from "../components/AuthNavbar.jsx";
import NewsFeed from "../components/NewsFeed.jsx";
import useAuth from "../hooks/useAuth.js";

/**
 * ============================================================================
 * Home.jsx
 * ============================================================================
 * Two completely different experiences live in this one page, switched by
 * auth state:
 *
 *   - LOGGED OUT -> original public hero (search-tag + map), unchanged.
 *   - LOGGED IN  -> AuthNavbar (no "About", hamburger menu) + NewsFeed
 *                   (search/filter bar + apartment cards + pagination).
 *
 * Everything below the imports is grouped into clearly labeled sections so
 * you can jump straight to the part you want to edit.
 * ============================================================================
 */
export default function Home() {
  // isAuthenticated flips the whole page between the two experiences.
  // See src/hooks/useAuth.js — swap its internals for your real auth check.
  const { isAuthenticated, isLoading } = useAuth();

  // Avoid a flash of the wrong UI while we're still checking auth state.
  if (isLoading) {
    return <div className="page-shell page-loading" aria-busy="true" />;
  }

  // ==========================================================================
  // SECTION A — AUTHENTICATED HOME (post-login/register)
  // ==========================================================================
  if (isAuthenticated) {
    return (
      <div className="page-shell">
        {/* --- Navbar: same visual style as login/logout pages, minus "About" --- */}
        <AuthNavbar />

        <main>
          {/* --- Newsfeed: search/filter bar + apartment posts + pagination --- */}
          <NewsFeed />
        </main>

        <footer className="site-footer">
          <div className="container">
            <p>APT&nbsp;RENT // EST. 2026</p>
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================================================
  // SECTION B — PUBLIC / LOGGED-OUT HOME (unchanged from your original code)
  // ==========================================================================
  return (
    <div className="page-shell">
      <Navbar />

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

            <form
              className="search-tag"
              role="search"
              aria-label="Search apartments"
            >
              <span className="search-icon">
                <img
                  src="/assets/icons/search.svg"
                  alt=""
                  width="16"
                  height="16"
                />
              </span>
              <span className="search-tag-seam" aria-hidden="true"></span>
              <input
                type="search"
                placeholder="Search by area, e.g. Gulshan, Dhanmondi..."
                aria-label="Search apartments by area"
              />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </form>
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
