import AppNavbar from "../components/AppNavbar.jsx";
import NewsFeed from "../components/NewsFeed.jsx";
import useAuth from "../hooks/useAuth.js";


export default function Dashboard() {
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
      if (!isAuthenticated) {
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
}