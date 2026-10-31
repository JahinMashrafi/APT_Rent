import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import ApartmentCard from "../components/ApartmentCard.jsx";
import api from "../services/api";
import { adaptProperty } from "../services/adapters";
import { useSaved } from "../context/SavedContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import "../css/global.css";
import "../css/navbar.css";
import "../css/newsfeed-home.css";
import "../css/modules.css";

export default function SavedListings() {
  const { t, formatNumber } = useLanguage();
  const { ids } = useSaved();
  const [state, setState] = useState({ items: null, error: false });

  useEffect(() => {
    let cancelled = false;
    api.saved
      .list()
      .then((res) => {
        if (cancelled) return;
        const items = (res?.data ?? []).map((row) => ({ ...adaptProperty(row), isUnavailable: row.is_unavailable }));
        setState({ items, error: false });
      })
      .catch(() => { if (!cancelled) setState({ items: [], error: true }); });
    return () => { cancelled = true; };
  }, []);

  // Un-hearting a card removes it from this page right away.
  const items = useMemo(() => (state.items ?? []).filter((item) => ids.has(String(item.id))), [state.items, ids]);

  return (
    <div className="module-shell">
      <AppNavbar />
      <main className="module-main-wide module-main">
        <span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>{t("saved.eyebrow")}</span>
        <h1 className="module-title">{t("saved.title")}</h1>
        <p className="module-subtitle" style={{ marginBottom: "1.5rem" }}>
          {state.items ? t("saved.count", { count: items.length, n: formatNumber(items.length) }) : t("saved.subtitle")}
        </p>

        {state.items === null ? (
          <p className="newsfeed-status">{t("feed.loading")}</p>
        ) : state.error ? (
          <p className="newsfeed-status">{t("feed.loadError")}</p>
        ) : items.length === 0 ? (
          <div className="fx-empty mod-card">
            <Heart size={44} aria-hidden="true" />
            <h2>{t("saved.empty")}</h2>
            <p>{t("saved.emptyBody")}</p>
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 14 }}>{t("saved.browse")}</Link>
          </div>
        ) : (
          <div className="newsfeed-grid">
            {items.map((apartment) => (
              <div key={apartment.id} style={{ position: "relative" }}>
                {apartment.isUnavailable && (
                  <span className="pill pill-danger" style={{ position: "absolute", top: 10, left: 10, zIndex: 4 }}>
                    {t("saved.unavailable")}
                  </span>
                )}
                <ApartmentCard apartment={apartment} />
              </div>
            ))}
          </div>
        )}
      </main>
      <footer className="site-footer"><div className="container"><p>{t("footer.brand")}</p></div></footer>
    </div>
  );
}