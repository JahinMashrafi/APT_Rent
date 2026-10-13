import { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../services/api";
import { normalizeUserPayload } from "../utils/auth";

// =============================================================================
// AppContext.jsx
// =============================================================================
// Global application state for APT Rent.
//
// Provides:
//   - role: "tenant" | "landlord" | "admin"
//   - currentUser: logged-in user object
//   - authReady: true once the "who am I" request has settled
//   - notifications: array of notification objects
//   - messageUnreadCount: total unread messages (nav badge), settable
//                         via setMessageUnreadCount
//   - switchRole(newRole): toggle between views
//   - applyAuthenticatedUser(user): called by Login/Register after a
//                         successful auth so guarded routes see the user
//   - markNotificationRead(id): mark one notification as read
//   - markAllNotificationsRead(): mark all as read
// =============================================================================

const AppContext = createContext(null);

// The notification bell is global, so it has to keep up with activity
// that happens on other pages. Slower than the inbox's 5s because this
// is one request for the whole app, not per open thread.
const NOTIFICATION_POLL_MS = 10000;

export function AppProvider({ children }) {
  const [role, setRole] = useState("tenant"); // "tenant" | "landlord" | "admin"
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  // Distinguishes "still asking the server who I am" from "definitely signed
  // out". currentUser is null in both cases, so guarded routes need this.
  const [authReady, setAuthReady] = useState(false);
  // Total unread messages across all conversations. Kept here rather than in
  // Inbox so the navbar badge can read it from anywhere.
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  // The role used to be a bare useState("tenant") that nothing ever
  // reconciled with the signed-in account, so a landlord-only user
  // landed on the tenant dashboard and had to switch by hand. Derive it
  // from the account's own flags instead.
  //
  // Dual-role accounts (John Doe and John Noe are both) still default to
  // tenant and keep the switcher — for them it is a genuine choice, not
  // a correction.
  const roleFor = useCallback((user) => {
    if (user?.isLandlord && !user.isTenant) return "landlord";
    return "tenant";
  }, []);

  // Signing in has to push the user into context, not just set a cookie.
  // currentUser was otherwise only ever assigned by the mount effect
  // above, so after a successful login it stayed null until a hard
  // reload — and every RequireAuth route sent a genuinely logged-in
  // user straight back to /login. Login and Register call this with the
  // user that loginUser/registerUser already return.
  const applyAuthenticatedUser = useCallback(
    (user) => {
      setCurrentUser(user);
      if (user) setRole(roleFor(user));
    },
    [roleFor],
  );

  useEffect(() => {
    api.users.me()
      .then((response) => {
        const user = normalizeUserPayload(response?.user ?? response);
        applyAuthenticatedUser(user);
      })
      .catch(() => applyAuthenticatedUser(null))
      .finally(() => setAuthReady(true));
  }, [applyAuthenticatedUser]);

  // Polled rather than fetched once. Without this, a tour request or a
  // new message raised on another page never reaches the bell until a
  // full reload — which is the whole notification half of the tour flow.
  // Gated on authReady so a signed-out visitor doesn't poll into 401s.
  useEffect(() => {
    if (!authReady || !currentUser) return undefined;

    let cancelled = false;

    const load = () =>
      api.notifications
        .list()
        .then((data) => {
          const rows = data?.data ?? data ?? [];
          const normalized = rows.map((row) => ({
            id: row.notification_id ?? row.id,
            type: row.notification_type ?? row.type,
            title: row.title,
            message: row.message,
            isRead: row.is_read ?? row.isRead ?? false,
            link: row.link_url ?? row.link ?? "/notifications",
            timestamp: row.created_at ?? row.timestamp,
          }));
          if (!cancelled) setNotifications(normalized);
        })
        // A failed poll is not worth surfacing; the last good list stands
        // and the next tick may well succeed.
        .catch(() => {});

    load();
    const timer = setInterval(() => {
      load().catch(() => {});
    }, NOTIFICATION_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [authReady, currentUser]);

  const switchRole = useCallback((newRole) => {
    setRole(newRole);
  }, []);

  // Optimistic, then persisted. The UI should not wait on a round-trip
  // to grey out a badge the user just clicked.
  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    api.notifications.markRead(id).catch(() => {});
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    api.notifications.markAllRead().catch(() => {});
  }, []);

  const clearSession = useCallback(() => {
    setCurrentUser(null);
    setNotifications([]);
    setMessageUnreadCount(0);
    setRole("tenant");
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        role,
        currentUser,
        authReady,
        notifications,
        unreadCount,
        messageUnreadCount,
        setMessageUnreadCount,
        switchRole,
        applyAuthenticatedUser,
        markNotificationRead,
        markAllNotificationsRead,
        clearSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}

export default AppContext;
