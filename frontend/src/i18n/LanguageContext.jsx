import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  translate,
  hasKey,
  localizeDigits,
  formatNumber,
  formatCurrency,
  formatDate,
  formatClock,
  relativeTime,
  dayLabel,
} from "./translate.js";

// =============================================================================
// LanguageContext.jsx
// Global i18n provider. Wrap the app root once (see main.jsx); every component
// then calls  const { t, lang, ... } = useLanguage().
//
// Persistence: the chosen language is stored in localStorage ("apt-rent-lang")
// and re-read on first render, so it survives reloads and route changes.
// =============================================================================

const STORAGE_KEY = "apt-rent-lang";
const LanguageContext = createContext(null);

function readStoredLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED_LANGS.includes(saved)) return saved;
  } catch {
    /* storage blocked (private mode) — use default */
  }
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  const setLang = useCallback((next) => {
    if (!SUPPORTED_LANGS.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  // <html lang="…"> drives the Bangla font rule in CSS + screen readers.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && SUPPORTED_LANGS.includes(e.newValue)) setLangState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Everything below is re-created only when `lang` changes, which is what
  // makes every consumer re-render in the new language instantly.
  const value = useMemo(
    () => ({
      lang,
      setLang,

      /** t("key", { name: "x", count: 3 }) */
      t: (key, vars) => translate(lang, key, vars),
      /** true if a key exists */
      has: (key) => hasKey(lang, key),
      /** Translate a DYNAMIC value (status from API, etc.) or fall back to the raw text.
       *  tx("status", "approved") -> t("status.approved"); unknown -> "approved" */
      tx: (prefix, value, fallback) => {
        if (value === null || value === undefined || value === "") return fallback ?? "";
        const key = `${prefix}.${String(value)}`;
        return hasKey(lang, key) ? translate(lang, key) : fallback ?? String(value);
      },
      /** Prefer a bilingual DB field: pick(apartment, "address") -> address_bn when lang is bn */
      pick: (obj, field) => (lang === "bn" && obj?.[`${field}_bn`]) || obj?.[field],

      digits: (v) => localizeDigits(v, lang),
      formatNumber: (v, opts) => formatNumber(v, lang, opts),
      formatCurrency: (v) => formatCurrency(v, lang),
      formatDate: (d, preset) => formatDate(d, lang, preset),
      formatClock: (d) => formatClock(d, lang),
      timeAgo: (d, opts) => relativeTime(d, lang, opts),
      dayLabel: (d) => dayLabel(d, lang),
    }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}