import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
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
  const [unreadCount, setUnreadCount] = useState(0);
  // Distinguishes "still asking the server who I am" from "definitely signed
  // out". currentUser is null in both cases, so guarded routes need this.
  const [authReady, setAuthReady] = useState(false);
  // Total unread messages across all conversations. Kept here rather than in
  // Inbox so the navbar badge can read it from anywhere.
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  // Notification polling can overlap a user click. These refs keep an older
  // GET response from changing a notification back to unread after the user
  // has just marked it as read.
  const notificationRequestRef = useRef(0);
  const optimisticReadIdsRef = useRef(new Set());
  const optimisticReadAllRef = useRef(false);

  // The role used to be a bare useState("tenant") that nothing ever
  // reconciled with the signed-in account, so a landlord-only user
  // landed on the tenant dashboard and had to switch by hand. Derive it
  // from the account's own flags instead.
  //
  // Dual-role accounts (John Doe and John Noe are both) still default to
  // tenant and keep the switcher — for them it is a genuine choice, not
  // a correction.
  const roleFor = useCallback((user) => {
    if (user?.isAdmin) return "admin";
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

  const loadNotifications = useCallback(async () => {
    const requestId = ++notificationRequestRef.current;
    const data = await api.notifications.list();

    // Ignore a response from a request that started before a newer refresh.
    if (requestId !== notificationRequestRef.current) return;

    const rows = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];

    let optimisticUnreadRows = 0;
    const normalized = rows.map((row) => {
      const id = row.notification_id ?? row.id;
      const serverIsRead = Boolean(row.is_read ?? row.isRead ?? false);
      const idKey = String(id);

      // Once the server confirms the read state, the optimistic override is
      // no longer needed for this notification.
      if (serverIsRead) optimisticReadIdsRef.current.delete(idKey);

      const forceRead = optimisticReadAllRef.current || optimisticReadIdsRef.current.has(idKey);
      if (forceRead && !serverIsRead) optimisticUnreadRows += 1;

      return {
        id,
        type: row.notification_type ?? row.type,
        title: row.title,
        message: row.message,
        isRead: serverIsRead || forceRead,
        link: row.link_url ?? row.link ?? "/notifications",
        timestamp: row.created_at ?? row.timestamp,
      };
    });

    const serverUnreadCount = Number.isFinite(Number(data?.unread_count))
      ? Math.max(0, Number(data.unread_count))
      : rows.filter((row) => !(row.is_read ?? row.isRead ?? false)).length;

    setNotifications(normalized);

    if (optimisticReadAllRef.current) {
      // Keep the badge at zero until the server confirms mark-all has landed.
      setUnreadCount(0);
      if (serverUnreadCount === 0) {
        optimisticReadAllRef.current = false;
        optimisticReadIdsRef.current.clear();
      }
    } else {
      // The server count includes reads still being persisted. Subtract those
      // optimistic reads so the bell changes immediately and stays correct.
      setUnreadCount(Math.max(0, serverUnreadCount - optimisticUnreadRows));
    }
  }, []);

  // Poll so notifications created on another page/device reach the bell.
  // Gated on authReady so a signed-out visitor doesn't poll into 401s.
  useEffect(() => {
    if (!authReady || !currentUser) return undefined;

    const load = () => loadNotifications().catch(() => {});
    load();
    const timer = setInterval(load, NOTIFICATION_POLL_MS);

    return () => {
      clearInterval(timer);
      // Invalidate any outstanding request when the account/effect changes.
      notificationRequestRef.current += 1;
    };
  }, [authReady, currentUser, loadNotifications]);

  const switchRole = useCallback((newRole) => {
    setRole(newRole);
  }, []);

  // Optimistically mark one item read, then reconcile with the server. The
  // id comparison is string-normalized to support either numeric or string
  // ids returned by PostgreSQL/JSON.
  const markNotificationRead = useCallback((id) => {
    const idKey = String(id);
    const target = notifications.find((notification) => String(notification.id) === idKey);
    if (!target || target.isRead || optimisticReadIdsRef.current.has(idKey)) return;

    optimisticReadIdsRef.current.add(idKey);
    setNotifications((prev) =>
      prev.map((notification) =>
        String(notification.id) === idKey ? { ...notification, isRead: true } : notification
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    api.notifications
      .markRead(id)
      .then(() => {
        // Invalidate polls started before the PATCH completed. The next GET
        // confirms the database state and clears the optimistic override.
        notificationRequestRef.current += 1;
        return loadNotifications();
      })
      .catch(() => {
        optimisticReadIdsRef.current.delete(idKey);
        notificationRequestRef.current += 1;
        loadNotifications().catch(() => {});
      });
  }, [notifications, loadNotifications]);

  const markAllNotificationsRead = useCallback(() => {
    optimisticReadAllRef.current = true;
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
    setUnreadCount(0);

    api.notifications
      .markAllRead()
      .then(() => {
        // Discard any GET started before mark-all finished, then fetch the
        // authoritative count (including any genuinely new notifications).
        notificationRequestRef.current += 1;
        optimisticReadAllRef.current = false;
        return loadNotifications();
      })
      .catch(() => {
        optimisticReadAllRef.current = false;
        notificationRequestRef.current += 1;
        loadNotifications().catch(() => {});
      });
  }, [loadNotifications]);

  const clearSession = useCallback(() => {
    notificationRequestRef.current += 1;
    setCurrentUser(null);
    setNotifications([]);
    setUnreadCount(0);
    optimisticReadIdsRef.current.clear();
    optimisticReadAllRef.current = false;
    setMessageUnreadCount(0);
    setRole("tenant");
  }, []);

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
