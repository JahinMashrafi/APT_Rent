// =============================================================================
// translate.js — PURE translation + formatting helpers (no React).
// Used by LanguageContext, and safe to import from plain .js files
// (utils, services, hooks) that cannot call useLanguage().
// =============================================================================
import en from "./locales/en.json";
import bn from "./locales/bn.json";

export const SUPPORTED_LANGS = ["en", "bn"];
export const DEFAULT_LANG = "en";
export const dictionaries = { en, bn };

const LOCALES = { en: "en-US", bn: "bn-BD" };
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

// ---- digits ----------------------------------------------------------------
/** "15,000" -> "১৫,০০০" when lang is "bn"; untouched for "en". */
export function localizeDigits(value, lang = DEFAULT_LANG) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (lang !== "bn") return str;
  return str.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

// ---- dictionary lookup -----------------------------------------------------
function lookup(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

/** true when `key` resolves to a string in `lang` (or English fallback). */
export function hasKey(lang, key) {
  return typeof lookup(dictionaries[lang], key) === "string" || typeof lookup(en, key) === "string";
}

const warned = new Set();

/**
 * translate("bn", "time.daysAgo", { count: 6 })  ->  "৬ দিন আগে"
 *
 *  - {name} placeholders are replaced from `vars`
 *  - numeric vars are rendered with the language's digits (bn -> ১২৩)
 *  - `count` picks "<key>_one" when count === 1 and that key exists (English plurals)
 *  - missing in `lang` -> falls back to English -> falls back to the key itself
 */
export function translate(lang, key, vars) {
  let resolvedKey = key;
  if (vars && typeof vars.count === "number" && vars.count === 1) {
    const oneKey = `${key}_one`;
    if (typeof lookup(dictionaries[lang], oneKey) === "string" || typeof lookup(en, oneKey) === "string") {
      resolvedKey = oneKey;
    }
  }

  let str = lookup(dictionaries[lang], resolvedKey);
  if (typeof str !== "string") str = lookup(en, resolvedKey);
  if (typeof str !== "string") {
    if (import.meta.env?.DEV && !warned.has(key)) {
      warned.add(key);
      console.warn(`[i18n] missing key: "${key}"`);
    }
    return key;
  }

  if (vars) {
    str = str.replace(/\{(\w+)\}/g, (match, name) => {
      if (!(name in vars)) return match;
      const v = vars[name];
      return typeof v === "number" ? formatNumber(v, lang) : String(v);
    });
  }
  return str;
}

// ---- numbers & money -------------------------------------------------------
/** 150000 -> "150,000" (en) | "১,৫০,০০০" (bn) */
export function formatNumber(value, lang = DEFAULT_LANG, options) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || Number.isNaN(n)) return "";
  return new Intl.NumberFormat(LOCALES[lang] ?? LOCALES.en, options).format(n);
}

/** 15000 -> "৳15,000" (en) | "৳১৫,০০০" (bn) */
export function formatCurrency(value, lang = DEFAULT_LANG) {
  const formatted = formatNumber(value ?? 0, lang);
  return `৳${formatted || formatNumber(0, lang)}`;
}

// ---- dates & times ---------------------------------------------------------
const DATE_PRESETS = {
  short: { month: "short", day: "numeric" },                                  // 5 Oct
  medium: { month: "short", day: "numeric", year: "numeric" },                // 5 Oct 2026
  long: { month: "long", day: "numeric", year: "numeric" },                   // October 5, 2026
  weekdayLong: { weekday: "long", month: "short", day: "numeric" },           // Monday, Oct 5
  weekdayFull: { weekday: "long", month: "long", day: "numeric" },            // Monday, October 5
  weekday: { weekday: "short" },                                              // Mon
  monthYear: { month: "long", year: "numeric" },                              // October 2026
};

function toDate(input) {
  if (input instanceof Date) return input;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** formatDate(iso, "en"|"bn", "long" | {Intl options}) */
export function formatDate(input, lang = DEFAULT_LANG, preset = "medium") {
  const d = toDate(input);
  if (!d) return "";
  const options = typeof preset === "string" ? DATE_PRESETS[preset] ?? DATE_PRESETS.medium : preset;
  return new Intl.DateTimeFormat(LOCALES[lang] ?? LOCALES.en, options).format(d);
}

/** ISO timestamp -> "03:07 PM" (en) | "০৩:০৭ PM" (bn) */
export function formatClock(input, lang = DEFAULT_LANG) {
  const d = toDate(input);
  if (!d) return "";
  return new Intl.DateTimeFormat(LOCALES[lang] ?? LOCALES.en, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Relative time: "just now", "5 minutes ago", "6 days ago", "2 months ago" …
 * style "long"  -> "6 days ago"  / "৬ দিন আগে"
 * style "short" -> "6d ago"      / "৬ দিন আগে"   (used on listing cards)
 */
export function relativeTime(input, lang = DEFAULT_LANG, { style = "long" } = {}) {
  const d = toDate(input);
  if (!d) return "";
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 0) return translate(lang, "time.justNow");

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  const years = Math.floor(months / 12);
  const suffix = style === "short" ? "Short" : "";

  if (minutes < 1) return translate(lang, "time.justNow");
  if (minutes < 60) return translate(lang, `time.minutesAgo${suffix}`, { count: minutes });
  if (hours < 24) return translate(lang, `time.hoursAgo${suffix}`, { count: hours });
  if (days < 30) return translate(lang, `time.daysAgo${suffix}`, { count: days });
  if (months < 12) return translate(lang, `time.monthsAgo${suffix}`, { count: Math.max(months, 1) });
  return translate(lang, `time.yearsAgo${suffix}`, { count: years });
}

/** "Today" / "Yesterday" / full date — used for chat date separators. */
export function dayLabel(input, lang = DEFAULT_LANG) {
  const d = toDate(input);
  if (!d) return "";
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return translate(lang, "common.today");
  if (diff < 172800000) return translate(lang, "common.yesterday");
  return formatDate(d, lang, "weekdayFull");
}