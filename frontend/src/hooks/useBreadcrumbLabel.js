import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";

// Tiny external store so a page (e.g. PropertyDetails) can give the
// breadcrumb a real name ("12 Test Rd") instead of "Property #12".
const labels = new Map();
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const getSnapshot = () => labels;

let version = 0;
const versioned = { subscribe, getSnapshot: () => version };
const bump = () => { version += 1; emit(); };

/** Call from a page: useBreadcrumbLabel(property?.title) */
export function useBreadcrumbLabel(label) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!label) return undefined;
    labels.set(pathname, label);
    bump();
    return () => { labels.delete(pathname); bump(); };
  }, [pathname, label]);
}

/** Used by <Breadcrumbs>. Re-renders when any label changes. */
export function useBreadcrumbLabels() {
  useSyncExternalStore(versioned.subscribe, versioned.getSnapshot, versioned.getSnapshot);
  return getSnapshot();
}