/**
 * ============================================================================
 * Dashboard.jsx
 * ============================================================================
 * You had two branches here — `if (isAuthenticated)` and `if (!isAuthenticated)`
 * — that rendered the exact same JSX. That wasn't the search-bar bug (that
 * one was inside NewsFeed.jsx — see the big comment at the top of that file),
 * but it is dead code: since both branches produce an identical page, the
 * if/else does nothing useful today. Collapsed to one return below.
 *
 * If you actually want a DIFFERENT dashboard for logged-out visitors later
 * (e.g. a locked/teaser view), bring the branch back and give it different
 * content — right now there's nothing to branch on.
 * ============================================================================
 */

import AppNavbar from "../components/AppNavbar.jsx";
import NewsFeed from "../components/NewsFeed.jsx";
import useAuth from "../hooks/useAuth.js";

export default function Dashboard() {
  const { isLoading } = useAuth();

  // Avoid a flash of the wrong UI while we're still checking auth state.
  if (isLoading) {
    return <div className="page-shell page-loading" aria-busy="true" />;
  }

  return (
    <div className="page-shell">
      <AppNavbar />

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
