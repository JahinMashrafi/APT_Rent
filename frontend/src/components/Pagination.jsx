/**
 * ============================================================================
 * Pagination.jsx
 * ============================================================================
 * Footer pagination shown under the newsfeed.
 *
 * Layout requested:
 *    [Prev]  [p-3] [p-2] [p-1] [CURRENT] [p+1] [p+2] [p+3]  [Next]
 *
 * Rules:
 *    - "Prev" is hidden when currentPage === 1 (first page)
 *    - "Next" is hidden when currentPage === totalPages (last page)
 *    - The page-number window is clamped so it never runs off either end
 *      (e.g. on page 1 you simply see [1] [2] [3] [4] with no Prev button,
 *       rather than empty/negative page numbers)
 *
 * Props:
 *    currentPage  (number)   - 1-indexed current page
 *    totalPages   (number)   - total number of pages
 *    onPageChange (function) - called with the new page number
 * ============================================================================
 */

import { useLanguage } from "../i18n/LanguageContext.jsx";
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const { t, formatNumber } = useLanguage();
  if (totalPages <= 1) return null;

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  // --------------------------------------------------------------------------
  // Build the visible page-number window: up to 3 before + current + up to
  // 3 after, clamped to [1, totalPages].
  // --------------------------------------------------------------------------
  const windowStart = Math.max(1, currentPage - 3);
  const windowEnd = Math.min(totalPages, currentPage + 3);

  const pageNumbers = [];
  for (let page = windowStart; page <= windowEnd; page++) {
    pageNumbers.push(page);
  }

  function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange?.(page);
  }

  return (
    <nav className="pagination-bar" aria-label={t("pagination.aria")}>
      {/* --- Prev button: hidden on the first page --- */}
      {!isFirstPage && (
        <button
          type="button"
          className="pagination-btn pagination-prev"
          onClick={() => goToPage(currentPage - 1)}
        >
          {t("pagination.prev")}
        </button>
      )}

      {/* --- Page number buttons (up to 3 before / after current) --- */}
      <ul className="pagination-numbers">
        {pageNumbers.map((page) => (
          <li key={page}>
            <button
              type="button"
              className={`pagination-btn pagination-number ${
                page === currentPage ? "is-current" : ""
              }`}
              aria-current={page === currentPage ? "page" : undefined}
              onClick={() => goToPage(page)}
            >
              {formatNumber(page)}
            </button>
          </li>
        ))}
      </ul>

      {/* --- Next button: hidden on the last page --- */}
      {!isLastPage && (
        <button
          type="button"
          className="pagination-btn pagination-next"
          onClick={() => goToPage(currentPage + 1)}
        >
          {t("pagination.next")}
        </button>
      )}
    </nav>
  );
}
