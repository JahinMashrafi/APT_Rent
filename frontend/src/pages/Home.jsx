import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="page-shell">

      {/* NAVBAR matching index.html */}
      <header className="navbar">
        <div className="container">
          <a href="/" className="brand">
            <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="brand-logo" />
          </a>

          <nav className="nav-links" id="navLinks">
            <a href="/">Home</a>
            <a href="#" className="is-locked" title="Sign in to browse properties">Properties <span className="lock-badge">Sign in</span></a>
            <a href="#" className="is-locked" title="Sign in to view this page">About <span className="lock-badge">Sign in</span></a>
          </nav>

          <div className="nav-actions">
            <div className="auth-only-out" style={{display: 'flex', gap: 10}}>
              <a href="/login" className="btn btn-ghost">Log in</a>
              <a href="/register" className="btn btn-primary">Register</a>
            </div>
            <div className="auth-only-in user-chip">
              <span className="avatar">A</span>
              Account
            </div>
            <button className="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">
              <img src="/assets/icons/menu.svg" alt="" />
            </button>
          </div>
        </div>
      </header>

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
