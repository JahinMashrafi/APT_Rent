/**
 * ============================================================================
 * formatRelativeDate.js
 * ============================================================================
 * Turns a listing's "created/posted" date into the relative label used on
 * apartment cards, per the requested format:
 *
 *    - under 30 days old   -> "12d ago"
 *    - under 12 months old -> "3m ago"
 *    - 12 months or older  -> "2y ago"
 *
 * Usage:
 *    formatRelativeDate("2026-08-20T10:00:00Z")  ->  "12d ago"
 *    formatRelativeDate(apartment.listedAt)
 * ============================================================================
 */
import { relativeTime } from "../i18n/translate.js";
export default function formatRelativeDate(dateInput, lang = "en") {
  if (!dateInput) return "";

  const listedDate = new Date(dateInput);
  const now = new Date();

  // Guard against invalid dates coming back from the API.
  if (Number.isNaN(listedDate.getTime())) return "";

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor((now - listedDate) / msPerDay);

  if (diffDays < 0) {
    // Listed date is somehow in the future (clock skew, bad data) — treat as "today".
    return "0d ago";
  }

  // --- Days (0 - 29 days old) ---------------------------------------------
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  // --- Months (30 days up to 11 months old) -------------------------------
  const diffMonths =
    (now.getFullYear() - listedDate.getFullYear()) * 12 +
    (now.getMonth() - listedDate.getMonth());

  if (diffMonths < 12) {
    return `${diffMonths}m ago`;
  }

  // --- Years (12+ months old) ----------------------------------------------
  const diffYears = Math.floor(diffMonths / 12);
  return relativeTime(dateInput, lang, { style: "short" });
  return `${diffYears}y ago`;
}
