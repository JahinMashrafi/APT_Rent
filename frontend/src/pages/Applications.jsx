
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import api from "../services/api";
import { adaptApplication, flattenApplication } from "../services/adapters";
import "../css/global.css";
import "../css/navbar.css";
import "../css/modules.css";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const STATUS_BADGE = {
  pending: "badge-warn",
  reviewed: "badge-ink",
  approved: "badge-success",
  rejected: "badge-error",
};

function appliedWhen(iso, t) {
  if (!iso) return "";

  const diff = Date.now() - new Date(iso).getTime();

  if (Number.isNaN(diff)) return "";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 1) return t("applications.today");
  if (days === 1) return t("applications.oneDayAgo");

  return t("applications.daysAgo", { count: days });
}

export default function Applications() {
  const { t, tx } = useLanguage();
  const [applications, setApplications] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    // GET /applications — tenants see their own submitted applications.
    api.applications
      .list()
      .then((data) => {
        if (cancelled) return;
        const items = (data?.data ?? [])
          .map(adaptApplication)
          .map(flattenApplication);

        setApplications(items);
        setLoadError("");
      })
      .catch((error) => {
        if (!cancelled) {
          setApplications([]);
          setLoadError(error.message || "__default__");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="module-shell">
      <AppNavbar />

      <main className="module-main">
        <div style={{ marginBottom: "2rem" }}>
          <span className="eyebrow">
            {t("applications.eyebrow")}
          </span>

          <h1 className="module-title">
            {t("applications.title")}
          </h1>

          <p className="module-subtitle">
            {t("applications.subtitle")}
          </p>
        </div>

        {loadError && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
              color: "var(--color-blueprint)",
              background: "var(--color-paper-dim)",
              border: "1px dashed var(--color-line-strong)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              marginBottom: "1.5rem",
            }}
          >
            {loadError === "__default__"
              ? t("applications.loadError")
              : loadError}
          </p>
        )}

        {applications.length === 0 ? (
          <div
            className="mod-card mod-card-pad"
            style={{
              textAlign: "center",
              color: "var(--color-charcoal)",
            }}
          >
            <FileText
              size={28}
              style={{
                color: "var(--color-line-strong)",
                margin: "0 auto 12px",
              }}
            />

            <p>{t("applications.empty")}</p>

            <Link
              to="/dashboard"
              className="btn btn-primary"
              style={{
                marginTop: "1rem",
                display: "inline-flex",
              }}
            >
              {t("common.browseListings")}
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {applications.map((application) => (
              <div
                key={application.id}
                className="mod-card mod-card-pad"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "1rem",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ flex: "1 1 220px" }}>
                  <Link
                    to={`/property/${application.propertyId}`}
                    style={{
                      fontWeight: 600,
                      color: "var(--color-ink)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {application.propertyTitle ??
                      application.property?.title}
                  </Link>

                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--color-blueprint)",
                      marginTop: "2px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Clock size={13} />
                    {t("applications.applied", {
                      when: appliedWhen(application.appliedAt, t),
                    })}
                  </p>
                </div>

                <span
                  className={`badge ${
                    STATUS_BADGE[application.status] ?? "badge-neutral"
                  }`}
                >
                  {tx("status", application.status ?? "pending")}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>{t("footer.brand")}</p>
        </div>
      </footer>
    </div>
  );
}
