import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Home,
  MessageSquare,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  CheckCheck,
  FileText,
  Calendar,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { logoutUser } from "../utils/auth";

// =============================================================================
// AppNavbar.jsx — Unified role-aware navigation bar
// =============================================================================
// Features:
//   • Role switcher pill (Tenant / Landlord / Admin)
//   • Notification bell with unread badge + dropdown
//   • User avatar + profile dropdown
//   • Role-specific nav links
//   • Fully mobile responsive (hamburger for sm/md)
// =============================================================================

const navLinks = {
  tenant: [
    { label: "Browse", to: "/dashboard", icon: Home },
    { label: "Applications", to: "/applications", icon: FileText },
    { label: "Inbox", to: "/inbox", icon: MessageSquare },
    { label: "Pay Rent", to: "/rent", icon: CreditCard },
  ],
  landlord: [
    { label: "Dashboard", to: "/landlord", icon: LayoutDashboard },
    { label: "Tour Requests", to: "/tour-requests", icon: Calendar },
    { label: "Inbox", to: "/inbox", icon: MessageSquare },
    { label: "Browse", to: "/dashboard", icon: Home },
  ],
  admin: [
    { label: "Admin Panel", to: "/admin", icon: ShieldCheck },
    { label: "Browse", to: "/dashboard", icon: Home },
    { label: "Inbox", to: "/inbox", icon: MessageSquare },
  ],
};

const roleLabels = { tenant: "Tenant", landlord: "Landlord", admin: "Admin" };

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AppNavbar() {
  const { role, currentUser, notifications, unreadCount, messageUnreadCount, switchRole, markNotificationRead, markAllNotificationsRead, clearSession } = useApp();
  const isDualRole = Boolean(currentUser?.isLandlord && currentUser?.isTenant);
  const isAdmin = Boolean(currentUser?.isAdmin);
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } finally {
      clearSession();
      setUserMenuOpen(false);
      setIsLoggingOut(false);
      navigate("/login", { replace: true });
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes the mobile menu on route change; deliberate.
    setMobileOpen(false);
  }, [location.pathname]);

  const links = navLinks[role] ?? navLinks.tenant;
  const initials =
    currentUser?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase() ?? "U";

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        <Link to="/" className="app-navbar-brand">
          <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent" className="app-navbar-logo" />
        </Link>

        <nav className="app-nav-links" aria-label="Main navigation">
          {links.map(({ label, to, icon: Icon }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
            const showMessageBadge = to === "/inbox" && messageUnreadCount > 0;
            return (
              <Link key={to} to={to} className={`app-nav-link ${isActive ? "is-active" : ""}`}>
                <Icon size={16} />
                {label}
                {showMessageBadge && (
                  <span className="notif-count">{messageUnreadCount > 9 ? "9+" : messageUnreadCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="app-navbar-actions">
          {/* Role switcher — only for accounts that really are both.
              A tenant-only or landlord-only user has nothing to switch
              between, and offering it let anyone impersonate the other
              side just by clicking. */}
          {(isDualRole || isAdmin) && (
            <div className="role-switch">
              {isDualRole && ["tenant", "landlord"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    if (role !== r) {
                      switchRole(r);
                      navigate(r === "landlord" ? "/landlord" : "/dashboard");
                    }
                  }}
                  className={`role-switch-btn ${role === r ? "is-active" : ""}`}
                >
                  {roleLabels[r]}
                </button>
              ))}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    switchRole("admin");
                    navigate("/admin");
                  }}
                  className={`role-switch-btn ${role === "admin" ? "is-active" : ""}`}
                  title="Admin"
                >
                  Admin
                </button>
              )}
            </div>
          )}

          {/* Notifications */}
          <div className="app-navbar-menu-wrapper" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen((o) => !o);
                setUserMenuOpen(false);
              }}
              className="icon-btn"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            >
              <Bell size={19} />
              {unreadCount > 0 && <span className="notif-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>

            {notifOpen && (
              <div className="app-dropdown notif-dropdown" role="menu">
                <div className="app-dropdown-header">
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <button type="button" className="dropdown-link" onClick={markAllNotificationsRead}>
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  )}
                </div>
                <ul className="notif-list">
                  {notifications.length === 0 ? (
                    <li className="notif-empty">You're all caught up.</li>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`notif-item ${!n.isRead ? "is-unread" : ""}`}
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                            navigate(n.link);
                          }}
                        >
                          {!n.isRead && <span className="notif-dot" />}
                          <span className="notif-item-body">
                            <span className="notif-item-title">{n.title}</span>
                            <span className="notif-item-message">{n.message}</span>
                            <span className="notif-item-time">{timeAgo(n.timestamp)}</span>
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
                {notifications.length > 0 && (
                  <div className="app-dropdown-footer">
                    <button
                      type="button"
                      className="dropdown-link"
                      onClick={() => {
                        setNotifOpen(false);
                        // Tour requests are the one notification type with
                        // a page of its own; everything else is either
                        // handled in place or has no inbox yet. Sending
                        // users to /inbox for all of them was simply wrong.
                        navigate(role === "landlord" ? "/tour-requests" : "/inbox");
                      }}
                    >
                      {role === "landlord" ? "View tour requests →" : "Go to Inbox →"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="app-navbar-menu-wrapper" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen((o) => !o);
                setNotifOpen(false);
              }}
              className="user-chip-btn"
              aria-label="User menu"
            >
              <span className="user-chip-avatar">{initials}</span>
              <span className="user-chip-name">{currentUser?.name?.split(" ")[0]}</span>
              <ChevronDown size={14} />
            </button>

            {userMenuOpen && (
              <div className="app-dropdown user-dropdown" role="menu">
                <div className="user-dropdown-header">
                  <p className="user-dropdown-name">{currentUser?.name}</p>
                  <p className="user-dropdown-email">{currentUser?.email}</p>
                  <span className="badge badge-neutral">{roleLabels[role]}</span>
                </div>
                <Link to="/profile" className="app-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <User size={15} /> View profile
                </Link>
                <Link to="/inbox" className="app-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <MessageSquare size={15} /> Inbox
                </Link>
                <button
                  type="button"
                  className="app-dropdown-item is-danger"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="icon-btn mobile-toggle"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="app-mobile-menu">
          <nav>
            {links.map(({ label, to, icon: Icon }) => {
              const isActive = location.pathname === to;
              const showMessageBadge = to === "/inbox" && messageUnreadCount > 0;
              return (
                <Link key={to} to={to} className={`app-nav-link ${isActive ? "is-active" : ""}`}>
                  <Icon size={17} />
                  {label}
                  {showMessageBadge && (
                    <span className="notif-count">{messageUnreadCount > 9 ? "9+" : messageUnreadCount}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          {(isDualRole || isAdmin) && (
            <div className="app-mobile-role-switch">
              <p className="app-mobile-role-label">Switch role</p>
              <div className="role-switch role-switch-block">
                {[...(isDualRole ? ["tenant", "landlord"] : []), ...(isAdmin ? ["admin"] : [])].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`role-switch-btn ${role === r ? "is-active" : ""}`}
                    onClick={() => {
                      switchRole(r);
                      navigate(r === "landlord" ? "/landlord" : r === "admin" ? "/admin" : "/dashboard");
                    }}
                  >
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
