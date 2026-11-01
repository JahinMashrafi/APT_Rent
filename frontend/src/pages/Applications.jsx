
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import api from "../services/api";
import { adaptApplication, flattenApplication } from "../services/adapters";
import "../css/global.css";
import "../css/navbar.css";
import "../css/modules.css";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useAddressTranslations } from "../hooks/useAddressTranslations.js";

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
  return t("time.daysAgo", { count: days });
}

export default function Applications() {
  const { t, tx, lang } = useLanguage();
  const [applications, setApplications] = useState([]);

  // The tenant application API currently supplies the property address as
  // the property's display title. Translate those addresses only in Bangla.
  const applicationAddresses = useMemo(
    () =>
      applications
        .map(
          (application) =>
            application.propertyAddress ??
            application.propertyTitle ??
            application.property?.address
        )
        .filter((address) => typeof address === "string" && address.trim()),
    [applications]
  );
  const translatedAddresses = useAddressTranslations(
    applicationAddresses,
    lang === "bn"
  );
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
      .catch(() => {
        if (!cancelled) {
          setApplications([]);
          setLoadError("__default__");
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
            {applications.map((application) => {
              const propertyAddress =
                application.propertyAddress ??
                application.propertyTitle ??
                application.property?.address;
              const displayPropertyAddress =
                (lang === "bn" &&
                  typeof propertyAddress === "string" &&
                  translatedAddresses[propertyAddress.trim()]) ||
                propertyAddress ||
                t("applications.untitledProperty");
              const normalizedStatus = String(
                application.status ?? "pending"
              )
                .trim()
                .toLowerCase();

              return (
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
                      {displayPropertyAddress}
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
                      STATUS_BADGE[normalizedStatus] ?? "badge-neutral"
                    }`}
                  >
                    {tx("status", normalizedStatus, t("status.pending"))}
                  </span>
                </div>
              );
            })}
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
