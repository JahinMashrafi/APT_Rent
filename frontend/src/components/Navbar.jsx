import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchCurrentUser, logoutUser } from "../utils/auth";

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const currentUser = await fetchCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Failed to load auth user", error);
        if (isMounted) {
          setUser(null);
        }
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setShowMenu(false);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="navbar">
      <div className="container">
        <Link to="/dashboard" className="brand">
          <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="brand-logo" />
        </Link>

        <nav className="nav-links" id="navLinks">
          <Link to="/dashboard">Feed</Link>
          <a href="#" className="is-locked" title="Sign in to browse properties">
            Properties <span className="lock-badge">Sign in</span>
          </a>
          <a href="#" className="is-locked" title="Sign in to view this page">
            About <span className="lock-badge">Sign in</span>
          </a>
        </nav>

        <div className="nav-actions">
          {user?.id ? (
            <div className="user-menu-wrapper" ref={menuRef} style={{ position: "relative" }}>
              <button
                className="auth-only-in user-chip"
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Open user menu"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "var(--color-surface-2)"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
              >
                {user.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt={`${user.name || "User"} profile`}
                    className="avatar-image"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="avatar">{(user?.name?.trim()?.[0] || "U").toUpperCase()}</span>
                )}
                Profile
              </button>
              {showMenu && (
                <div
                  className="user-menu-dropdown"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: "0",
                    marginTop: "8px",
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    minWidth: "180px",
                    zIndex: "1000",
                    overflow: "hidden",
                  }}
                >
                  <Link
                    to="/profile"
                    className="menu-item"
                    style={{
                      display: "block",
                      padding: "12px 16px",
                      color: "var(--color-text)",
                      textDecoration: "none",
                      borderBottom: "1px solid var(--color-border)",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "var(--color-surface-2)"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                    onClick={() => setShowMenu(false)}
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="menu-item"
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "12px 16px",
                      color: "var(--color-error)",
                      textAlign: "left",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                      fontSize: "1rem",
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "var(--color-surface-2)"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-only-out" style={{ display: "flex", gap: 10 }}>
              <Link to="/login" className="btn btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}