import { createContext, useContext, useState, useCallback } from "react";
import {
  mockCurrentUser,
  mockNotifications as initialNotifications,
} from "../data/mockData";

// =============================================================================
// AppContext.jsx
// =============================================================================
// Global application state for APT Rent.
//
// Provides:
//   - role: "tenant" | "landlord" | "admin"
//   - currentUser: logged-in user object
//   - notifications: array of notification objects
//   - switchRole(newRole): toggle between views
//   - markNotificationRead(id): mark one notification as read
//   - markAllNotificationsRead(): mark all as read
// =============================================================================

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [role, setRole] = useState("tenant"); // "tenant" | "landlord" | "admin"
  const [currentUser] = useState(mockCurrentUser);
  const [notifications, setNotifications] = useState(initialNotifications);

  const switchRole = useCallback((newRole) => {
    setRole(newRole);
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        role,
        currentUser,
        notifications,
        unreadCount,
        switchRole,
        markNotificationRead,
        markAllNotificationsRead,
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
