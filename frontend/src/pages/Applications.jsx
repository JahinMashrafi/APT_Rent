import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import { mockApplications, mockProperties } from "../data/mockData.js";
import api from "../services/api";
import { adaptApplication, flattenApplication } from "../services/adapters";
import "../css/global.css";
import "../css/navbar.css";
import "../css/modules.css";

// Mock fallback shaped like the tenant's own submitted applications, until
// GET /applications is reachable — reuses the shared mock dataset so
// property titles line up with what's on the listings pages.
const FALLBACK_APPLICATIONS = mockApplications.map((application) => ({
  ...flattenApplication(application),
  property: mockProperties.find((p) => p.id === application.propertyId),
}));

const STATUS_BADGE = {
  pending: "badge-warn",
  reviewed: "badge-ink",
  approved: "badge-success",
  rejected: "badge-error",
};

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function Applications() {
  const [applications, setApplications] = useState(FALLBACK_APPLICATIONS);
  const [usingMock, setUsingMock] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // GET /applications — tenants see their own submitted applications.
    api.applications
      .list()
      .then((data) => {
        if (cancelled) return;
        const items = (data?.data ?? []).map(adaptApplication).map(flattenApplication);
        setApplications(items);
        setUsingMock(false);
      })
      .catch(() => {
        // No backend yet — keep the mock already in state.
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
          <span className="eyebrow">Tenant Portal</span>
          <h1 className="module-title">My Applications</h1>
          <p className="module-subtitle">Track the rental applications you've submitted to landlords.</p>
        </div>

        {usingMock && (
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
            Showing mock data — GET /applications isn't reachable yet.
          </p>
        )}

        {applications.length === 0 ? (
          <div className="mod-card mod-card-pad" style={{ textAlign: "center", color: "var(--color-charcoal)" }}>
            <FileText size={28} style={{ color: "var(--color-line-strong)", margin: "0 auto 12px" }} />
            <p>You haven't applied to any properties yet.</p>
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
              Browse listings
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {applications.map((application) => (
              <div
                key={application.id}
                className="mod-card mod-card-pad"
                style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", justifyContent: "space-between" }}
              >
                <div style={{ flex: "1 1 220px" }}>
                  <Link
                    to={`/property/${application.propertyId}`}
                    style={{ fontWeight: 600, color: "var(--color-ink)", fontFamily: "var(--font-display)" }}
                  >
                    {application.propertyTitle ?? application.property?.title}
                  </Link>
                  <p style={{ fontSize: "0.82rem", color: "var(--color-blueprint)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={13} /> Applied {timeAgo(application.appliedAt)}
                  </p>
                </div>

                <span className={`badge ${STATUS_BADGE[application.status] ?? "badge-neutral"}`}>
                  {application.status ?? "pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>APT&nbsp;RENT // EST. 2026</p>
        </div>
      </footer>
    </div>
  );
}
