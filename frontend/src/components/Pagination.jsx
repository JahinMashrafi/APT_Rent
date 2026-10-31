import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const ELLIPSIS = "ellipsis";

function getPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, ELLIPSIS, totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      ELLIPSIS,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    ELLIPSIS,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    ELLIPSIS,
    totalPages,
  ];
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const { t, formatNumber } = useLanguage();

  if (!Number.isFinite(totalPages) || totalPages <= 1) return null;

  const safeTotalPages = Math.max(1, Math.floor(totalPages));
  const safeCurrentPage = Math.min(
    safeTotalPages,
    Math.max(1, Math.floor(currentPage || 1))
  );
  const isFirstPage = safeCurrentPage === 1;
  const isLastPage = safeCurrentPage === safeTotalPages;
  const pageItems = getPageItems(safeCurrentPage, safeTotalPages);

  function goToPage(page) {
    if (page < 1 || page > safeTotalPages || page === safeCurrentPage) return;
    onPageChange?.(page);
  }

  return (
    <nav className="pagination-bar" aria-label={t("pagination.aria")}>
      <div className="pagination-shell">
        <button
          type="button"
          className="pagination-action pagination-prev"
          onClick={() => goToPage(safeCurrentPage - 1)}
          disabled={isFirstPage}
          aria-label={t("pagination.prev")}
        >
          <ChevronLeft size={17} strokeWidth={2.2} aria-hidden="true" />
          <span className="pagination-action-label">{t("pagination.prev")}</span>
        </button>

        <span className="pagination-divider" aria-hidden="true" />

        <ul className="pagination-numbers">
          {pageItems.map((page, index) =>
            page === ELLIPSIS ? (
              <li className="pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">
                <span>···</span>
              </li>
            ) : (
              <li key={page}>
                <button
                  type="button"
                  className={`pagination-number${page === safeCurrentPage ? " is-current" : ""}`}
                  aria-current={page === safeCurrentPage ? "page" : undefined}
                  aria-label={t("pagination.goToPage", { page: formatNumber(page) })}
                  onClick={() => goToPage(page)}
                >
                  {formatNumber(page)}
                </button>
              </li>
            )
          )}
        </ul>

        <span className="pagination-divider" aria-hidden="true" />

        <button
          type="button"
          className="pagination-action pagination-next"
          onClick={() => goToPage(safeCurrentPage + 1)}
          disabled={isLastPage}
          aria-label={t("pagination.next")}
        >
          <span className="pagination-action-label">{t("pagination.next")}</span>
          <ChevronRight size={17} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>

      <p className="pagination-status" aria-live="polite">
        {t("pagination.pageStatus", {
          current: formatNumber(safeCurrentPage),
          total: formatNumber(safeTotalPages),
        })}
      </p>
    </nav>
  );
}
