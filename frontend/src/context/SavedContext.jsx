import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useApp } from "./AppContext.jsx";

// Which listings the signed-in user has saved. Kept in one place so every
// heart on every card (feed, details, compare) stays in sync.
const SavedContext = createContext(null);
const EMPTY = new Set();

export function SavedProvider({ children }) {
  const { currentUser } = useApp();
  const userId = currentUser?.id ?? null;
  const [loaded, setLoaded] = useState({ userId: null, ids: EMPTY });

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    api.saved
      .ids()
      .then((res) => {
        if (!cancelled) setLoaded({ userId, ids: new Set((res?.data ?? []).map(String)) });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  // Signed out (or a different account just signed in) -> nothing is saved.
  const ids = loaded.userId === userId ? loaded.ids : EMPTY;

  const isSaved = useCallback((propertyId) => ids.has(String(propertyId)), [ids]);

  /** Optimistic toggle. Resolves to "saved" | "removed"; throws (after reverting) on failure. */
  const toggle = useCallback(async (propertyId) => {
    const key = String(propertyId);
    const wasSaved = ids.has(key);
    const apply = (add) =>
      setLoaded((prev) => {
        const next = new Set(prev.userId === userId ? prev.ids : EMPTY);
        if (add) next.add(key); else next.delete(key);
        return { userId, ids: next };
      });

    apply(!wasSaved);
    try {
      if (wasSaved) await api.saved.remove(key); else await api.saved.save(key);
      return wasSaved ? "removed" : "saved";
    } catch (err) {
      apply(wasSaved);
      throw err;
    }
  }, [ids, userId]);

  const value = useMemo(() => ({ ids, count: ids.size, isSaved, toggle }), [ids, isSaved, toggle]);
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used within <SavedProvider>");
  return ctx;
}