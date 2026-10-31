
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import ImageSlider from "../components/property/ImageSlider.jsx";
import PropertyInfo from "../components/property/PropertyInfo.jsx";
import PropertyLocation from "../components/property/PropertyLocation.jsx";
import PropertyCTA from "../components/property/PropertyCTA.jsx";
import ReviewsSection from "../components/property/ReviewsSection.jsx";
import api from "../services/api";
import { adaptProperty } from "../services/adapters";
import { useApp } from "../context/AppContext.jsx";
import "../css/global.css";
import "../css/navbar.css";
import "../css/newsfeed-home.css";
import "../css/modules.css";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useAddressTranslations } from "../hooks/useAddressTranslations.js";

export default function PropertyDetails() {
  const { id, propertyId } = useParams();
  const navigate = useNavigate();
  const { currentUser, authReady } = useApp();
  const { t, lang } = useLanguage();

  const targetId = id || propertyId;
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // Collect all user-visible property text that should be translated:
  // address, title, location address, and the listing description.
  // The existing translation endpoint caches these strings in Supabase.
  const propertyTextsToTranslate = useMemo(() => {
    const values = [
      property?.address,
      property?.location?.address,
      property?.title,
      property?.description,
    ];

    return [
      ...new Set(
        values
          .filter((value) => typeof value === "string")
          .map((value) => value.trim())
          // The existing backend translation endpoint accepts up to 500 UTF-8 bytes per item.
          // Skip longer text so it cannot block translation of the other property fields.
          .filter(
            (value) =>
              value.length > 0 &&
              new TextEncoder().encode(value).length <= 500
          )
      ),
    ];
  }, [
    property?.address,
    property?.location?.address,
    property?.title,
    property?.description,
  ]);

  // Translate only when Bangla is selected.
  const propertyTextTranslations = useAddressTranslations(
    propertyTextsToTranslate,
    lang === "bn"
  );

  // Keep the original value in English and fall back to it if translation
  // is unavailable. This is also used for owner-written descriptions.
  const getDisplayText = (value) => {
    if (typeof value !== "string" || lang !== "bn") return value;

    return propertyTextTranslations[value.trim()] || value;
  };

  const displayAddress = getDisplayText(property?.address);
  const displayLocationAddress = getDisplayText(property?.location?.address);
  const displayTitle = getDisplayText(property?.title);
  const displayDescription = getDisplayText(property?.description);

  // Create a display-only property object. Do not alter the original data
  // used by the API or saved in the database.
  const displayProperty = property
    ? {
        ...property,
        address: displayAddress,
        title: displayTitle,
        description: displayDescription,
        location: property.location
          ? {
              ...property.location,
              address: displayLocationAddress,
            }
          : property.location,
      }
    : property;

  useEffect(() => {
    let cancelled = false;

    api.properties
      .getById(targetId)
      .then((data) => {
        if (!cancelled) setProperty(adaptProperty(data));
      })
      .catch((error) => {
        if (!cancelled) {
          setProperty(null);
          setLoadError(error.message || "__default__");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [targetId]);

  const handleContactLandlord = () => {
    if (property?.landlord?.id) {
      
      const target = `/inbox?contact=${property.landlord.id}&property=${property.id}`;

      if (authReady && !currentUser) {
        navigate("/login", {
          state: {
            from: {
              pathname: "/inbox",
              search: target.slice("/inbox".length),
            },
          },
        });
        return;
      }

      navigate(target);
    }
  };

  // 404 / Loading / Error state
  if (isLoading || !property) {
    return (
      <div className="module-shell">
        <AppNavbar />

        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "4rem 1rem",
            textAlign: "center",
          }}
        >
          <Building2
            size={56}
            style={{
              color: "var(--color-line-strong)",
              marginBottom: "1.5rem",
            }}
          />

          <h1
            className="module-title"
            style={{ fontSize: "1.6rem" }}
          >
            {isLoading
              ? t("propertyDetails.loadingTitle")
              : loadError
                ? t("propertyDetails.unableToLoad")
                : t("propertyDetails.notFound")}
          </h1>

          <p
            className="module-subtitle"
            style={{ maxWidth: "360px", marginTop: "8px" }}
          >
            {isLoading
              ? t("propertyDetails.loadingBody")
              : loadError
                ? loadError === "__default__"
                  ? t("propertyDetails.loadFailed")
                  : loadError
                : t("propertyDetails.notFoundBody")}
          </p>

          <Link
            to="/dashboard"
            className="btn btn-primary"
            style={{ marginTop: "1.5rem" }}
          >
            ← {t("propertyDetails.backToListings")}
          </Link>
        </main>

        <footer className="site-footer">
          <div className="container">
            <p>APT&nbsp;RENT // EST. 2026</p>
          </div>
        </footer>
      </div>
    );
  }

  // Main page
  return (
    <div className="module-shell">
      <AppNavbar />

      <main
        className="module-main"
        style={{ paddingBottom: "6rem" }}
      >
        {/* Back button */}
        <button
          className="back-btn"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={15} />{" "}
          {t("propertyDetails.backToListings")}
        </button>

        {/* Two-column layout */}
        <div className="property-layout">
          {/* Left column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2.5rem",
            }}
          >
                <ImageSlider
                  images={property.photos}
                  title={displayTitle}
                />

            <PropertyInfo property={displayProperty} />

            <div
              style={{
                borderTop: "1px solid var(--color-line)",
                paddingTop: "2rem",
              }}
            >
              <PropertyLocation
                lat={property.lat}
                lng={property.lng}
                title={displayTitle}
                address={displayAddress}
              />
            </div>

            <div
              style={{
                borderTop: "1px solid var(--color-line)",
                paddingTop: "2rem",
              }}
            >
              <ReviewsSection propertyId={property.id} />
            </div>
          </div>

          {/* Right column: desktop CTA */}
          <div className="property-sidebar cta-desktop">
            <PropertyCTA
              propertyId={property.id}
              ownerId={property.landlord?.id}
              pricePerMonth={property.pricePerMonth}
              onContactLandlord={handleContactLandlord}
            />
          </div>
        </div>
      </main>

      {/* Mobile CTA */}
      <PropertyCTA
        propertyId={property.id}
        ownerId={property.landlord?.id}
        pricePerMonth={property.pricePerMonth}
        onContactLandlord={handleContactLandlord}
        mobileOnly
      />

      <footer
        className="site-footer"
        style={{ marginTop: "auto" }}
      >
        <div className="container">
          <p>APT&nbsp;RENT // EST. 2026</p>
        </div>
      </footer>
    </div>
  );
}
