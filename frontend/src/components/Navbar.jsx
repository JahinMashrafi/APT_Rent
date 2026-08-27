import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCurrentUser } from "../utils/auth";

export default function Navbar() {
  const [user, setUser] = useState(null);

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

  const avatarInitial = (user?.name?.trim()?.[0] || "U").toUpperCase();

  return (
    <header className="navbar">
      <div className="container">
        <Link to="/" className="brand">
          <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="brand-logo" />
        </Link>

        <nav className="nav-links" id="navLinks">
          <Link to="/">Home</Link>
          <a href="#" className="is-locked" title="Sign in to browse properties">
            Properties <span className="lock-badge">Sign in</span>
          </a>
          <a href="#" className="is-locked" title="Sign in to view this page">
            About <span className="lock-badge">Sign in</span>
          </a>
        </nav>

        <div className="nav-actions">
          {user?.id ? (
            <Link to="/profile" className="auth-only-in user-chip" aria-label="Open profile">
              {user.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt={`${user.name || "User"} profile`}
                  className="avatar-image"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="avatar">{avatarInitial}</span>
              )}
              Profile
            </Link>
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