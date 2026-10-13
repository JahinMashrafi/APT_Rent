import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { mockProperties } from "../data/mockData.js";
import AppNavbar from "../components/AppNavbar.jsx";
import ImageSlider from "../components/property/ImageSlider.jsx";
import PropertyInfo from "../components/property/PropertyInfo.jsx";
import PropertyLocation from "../components/property/PropertyLocation.jsx";
import PropertyCTA from "../components/property/PropertyCTA.jsx";
import ReviewsSection from "../components/property/ReviewsSection.jsx";
import api from "../services/api";
import { adaptProperty } from "../services/adapters";
import "../css/global.css";
import "../css/navbar.css";
import "../css/newsfeed-home.css";
import "../css/modules.css";

export default function PropertyDetails() {
  const { id, propertyId } = useParams();
  const navigate = useNavigate();

  const targetId = id || propertyId;
  const [property, setProperty] = useState(() => mockProperties.find((p) => p.id === targetId) ?? null);

  useEffect(() => {
    let cancelled = false;

    // GET /properties/:id — public, no auth required.
    api.properties
      .getById(targetId)
      .then((data) => {
        if (!cancelled) setProperty(adaptProperty(data));
      })
      .catch(() => {
        // No backend yet — keep whatever mock match was already set.
        if (!cancelled) setProperty(mockProperties.find((p) => p.id === targetId) ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [targetId]);

  const handleContactLandlord = () => {
    if (property?.landlord?.id) {
      navigate(`/inbox?contact=${property.landlord.id}`);
    }
  };

  // ── 404 state ──────────────────────────────────────────────────────────────
  if (!property) {
    return (
      <div className="module-shell">
        <AppNavbar />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 1rem", textAlign: "center" }}>
          <Building2 size={56} style={{ color: "var(--color-line-strong)", marginBottom: "1.5rem" }} />
          <h1 className="module-title" style={{ fontSize: "1.6rem" }}>Property Not Found</h1>
          <p className="module-subtitle" style={{ maxWidth: "360px", marginTop: "8px" }}>
            The property you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
            ← Back to listings
          </Link>
        </main>
        <footer className="site-footer"><div className="container"><p>APT&nbsp;RENT // EST. 2026</p></div></footer>
      </div>
    );
  }

  // ── Main page ───────────────────────────────────────────────────────────────
  return (
    <div className="module-shell">
      <AppNavbar />

      <main className="module-main" style={{ paddingBottom: "6rem" }}>
        {/* Back button */}
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back to listings
        </button>

        {/* Two-column layout: content (left) + CTA sidebar (right) */}
        <div className="property-layout">

          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            <ImageSlider images={property.photos} title={property.title} />
            <PropertyInfo property={property} />
            <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: "2rem" }}>
              <PropertyLocation
                lat={property.lat}
                lng={property.lng}
                title={property.title}
                address={property.address}
              />
            </div>
            <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: "2rem" }}>
              <ReviewsSection propertyId={property.id} />
            </div>
          </div>

          {/* ── Right column: sticky CTA (desktop only via CSS) ── */}
          <div className="property-sidebar cta-desktop">
            <PropertyCTA
              propertyId={property.id}
              pricePerMonth={property.pricePerMonth}
              onContactLandlord={handleContactLandlord}
            />
          </div>
        </div>
      </main>

      {/* Mobile CTA bottom bar — rendered once inside PropertyCTA via CSS class */}
      <PropertyCTA
        propertyId={property.id}
        pricePerMonth={property.pricePerMonth}
        onContactLandlord={handleContactLandlord}
        mobileOnly
      />

      <footer className="site-footer" style={{ marginTop: "auto" }}>
        <div className="container"><p>APT&nbsp;RENT // EST. 2026</p></div>
      </footer>
    </div>
  );
}
