import { Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { useSaved } from "../context/SavedContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useToast } from "./ui/Toast.jsx";

/** Heart toggle for a listing. variant="icon" (cards) or "full" (details page). */
export default function SaveButton({ propertyId, variant = "icon" }) {
  const { t } = useLanguage();
  const { currentUser, authReady } = useApp();
  const { isSaved, toggle } = useSaved();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const saved = isSaved(propertyId);

  async function handleClick(event) {
    // The card is a <Link>; keep the click from navigating.
    event.preventDefault();
    event.stopPropagation();

    if (authReady && !currentUser) {
      navigate("/login", { state: { from: { pathname: location.pathname, search: location.search } } });
      return;
    }
    try {
      const result = await toggle(propertyId);
      showToast({ message: t(result === "saved" ? "saved.added" : "saved.removed"), type: "success" });
    } catch {
      showToast({ message: t("saved.failed"), type: "error" });
    }
  }

  const label = saved ? t("saved.unsave") : t("saved.save");
  return (
    <button
      type="button"
      className={`save-btn save-btn-${variant} ${saved ? "is-saved" : ""}`}
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
    >
      <Heart size={variant === "full" ? 17 : 18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      {variant === "full" && <span>{saved ? t("saved.savedLabel") : t("saved.save")}</span>}
    </button>
  );
}