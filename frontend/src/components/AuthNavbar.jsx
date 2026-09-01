import { Link } from "react-router-dom";
import HamburgerMenu from "./HamburgerMenu.jsx";

export default function AuthNavbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" aria-label="APT Rent home">
          <img
            src="/assets/images/logo/apt-rent-logo.png"
            alt="APT Rent logo"
            className="brand-logo"
          />
        </Link>

        <nav className="navbar-links" aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/listings">Listings</Link>
          <Link to="/contact">Contact</Link>
        </nav>

        <div className="navbar-actions">
          <HamburgerMenu />
        </div>
      </div>
    </header>
  );
}
