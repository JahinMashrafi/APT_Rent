import { useState } from "react";
import api from "../../services/api";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

const MAX_COMMENT = 1000;

export default function ReviewForm({ userId, revieweeName, onSubmitted, onIneligible }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setOpen(false);
    setRating(0);
    setHover(0);
    setComment("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (rating < 1) {
      setError(t("profileView.ratingRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.reviews.create(userId, { rating, comment: comment.trim() || undefined });
      reset();
      onSubmitted?.();
    } catch (err) {
      // 403 / 409 mean the server says we're no longer allowed: hide the form.
      if (err?.status === 403 || err?.status === 409) onIneligible?.();
      setError(err?.message || t("profileView.reviewFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn btn-primary btn-sm pv-review-open" onClick={() => setOpen(true)}>
        {t("profileView.writeReview")}
      </button>
    );
  }

  const shown = hover || rating;

  return (
    <form className="pv-review-form" onSubmit={handleSubmit} noValidate>
      <h3>{t("profileView.reviewFormTitle", { name: revieweeName })}</h3>

      <div role="radiogroup" aria-label={t("profileView.yourRating")} className="pv-star-input" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={t("profileView.ratingOutOfFive", { rating: n })}
            className={n <= shown ? "pv-star is-on" : "pv-star"}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => setRating(n)}
          >
            ★
          </button>
        ))}
      </div>

      <label className="pv-review-label" htmlFor="review-comment">{t("profileView.yourComment")}</label>
      <textarea
        id="review-comment"
        rows={4}
        maxLength={MAX_COMMENT}
        value={comment}
        placeholder={t("profileView.commentPlaceholder")}
        onChange={(e) => setComment(e.target.value)}
      />
      <small className="pv-review-count">{comment.length}/{MAX_COMMENT}</small>

      {error ? <p className="profile-error" role="alert">{error}</p> : null}

      <div className="pv-review-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
          {submitting ? t("profileView.submitting") : t("profileView.submitReview")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={submitting}>
          {t("profileView.cancelReview")}
        </button>
      </div>
    </form>
  );
}