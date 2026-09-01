/**
 * ============================================================================
 * HamburgerMenu.jsx
 * ============================================================================
 * Top-right hamburger dropdown shown ONLY on the authenticated home bar.
 *
 * Contains the four links requested:
 *   1. Profile details
 *   2. Wishlist
 *   3. Map View
 *   4. My current apartment
 *
 * This component is self-contained (owns its own open/close state) so you
 * can drop it into any navbar without extra wiring.
 * ============================================================================
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom"; // TODO: swap for next/link if this is a Next.js project

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // --- Close the menu when clicking anywhere outside of it -----------------
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- The 4 menu items in one place, so re-ordering/editing is easy -------
  const menuItems = [
    { label: "Profile details", to: "/profile", icon: "/assets/icons/user.svg" },
    { label: "Wishlist", to: "/wishlist", icon: "/assets/icons/heart.svg" },
    { label: "Map View", to: "/map-view", icon: "/assets/icons/map.svg" },
    { label: "My current apartment", to: "/my-apartment", icon: "/assets/icons/home.svg" },
  ];

  return (
    <div className="hamburger-menu" ref={menuRef}>
      {/* --- Hamburger icon / toggle button --- */}
      <button
        type="button"
        className="hamburger-toggle"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Open account menu"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="hamburger-bar" />
        <span className="hamburger-bar" />
        <span className="hamburger-bar" />
      </button>

      {/* --- Dropdown panel (only rendered when open) --- */}
      {isOpen && (
        <nav className="hamburger-dropdown" aria-label="Account menu">
          <ul>
            {menuItems.map((item) => (
              <li key={item.to}>
                <Link to={item.to} onClick={() => setIsOpen(false)}>
                  <img src={item.icon} alt="" width="16" height="16" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
