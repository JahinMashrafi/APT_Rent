import Navbar from "../components/Navbar.jsx";

export default function Home() {
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
            <span className="eyebrow">Verified listings · Digital leases · Cashless rent</span>
            <h1><em>Find Your Next Home</em></h1>

            <form className="search-tag" role="search" aria-label="Search apartments">
              <span className="search-icon">
                <img src="/assets/icons/search.svg" alt="" width="16" height="16" />
              </span>
              <span className="search-tag-seam" aria-hidden="true"></span>
              <input type="search" placeholder="Search by area, e.g. Gulshan, Dhanmondi..." aria-label="Search apartments by area" />
              <button type="submit" className="btn btn-primary">Search</button>
            </form>
            <p className="hero-note">Sign in to unlock live listings, filters, and saved searches.</p>
          </div>
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
