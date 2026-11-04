import ReviewForm from "../components/profile/ReviewForm.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppNavbar from "../components/AppNavbar.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import { occupationLabel } from "../utils/occupations";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useAddressTranslations } from "../hooks/useAddressTranslations.js";
import api from "../services/api";

const stars = (rating) => {
  const full = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return "★".repeat(full) + "☆".repeat(5 - full);
};

export default function ProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang, formatDate, formatNumber, formatCurrency } = useLanguage();

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [justReviewed, setJustReviewed] = useState(false);

  useEffect(() => {
    let alive = true;
    setProfile(null);
    setReviews([]);
    setJustReviewed(false);
    setError("");

    api.users
      .getProfile(id)
      .then((data) => {
        if (alive) setProfile(data);
      })
      .catch((err) => {
        if (!alive) return;
        const status = err?.status ?? err?.response?.status;
        if (status === 401 || status === 403) navigate("/login");
        else if (status === 404) setError("notFound");
        else setError("loadFailed");
      });

    // Reviews load separately so a failure here never hides the profile itself.
    api.reviews
      .getForUser(id)
      .then((data) => {
        if (alive) setReviews(data?.data ?? []);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [id, navigate]);

  // Profile addresses use the same cached Bangla address-translation API as listings.
  const addressesToTranslate = useMemo(
    () => [
      profile?.contact?.address,
      ...(profile?.listings ?? []).map((listing) => listing?.address),
    ].filter((address) => typeof address === "string" && address.trim()),
    [profile]
  );
  const translatedAddresses = useAddressTranslations(
    addressesToTranslate,
    lang === "bn"
  );
  // The server decides; the UI only reads the flag. Self-profile is hidden as a second guard.
  const canReview = Boolean(profile?.review_eligibility?.can_review) && !profile?.is_self;

  const lockReviewForm = () =>
    setProfile((p) => (p ? { ...p, review_eligibility: { ...p.review_eligibility, can_review: false } } : p));

  const handleReviewSubmitted = async () => {
    lockReviewForm();
    setJustReviewed(true);
    try {
      const data = await api.reviews.getForUser(id);
      setReviews(data?.data ?? []);
      setProfile((p) =>
        p ? { ...p, average_rating: data.average_rating, total_reviews: data.total_reviews } : p,
      );
    } catch {
      /* the review was saved; the list will refresh on next visit */
    }
  };
    useEffect(() => {
    if (profile && window.location.hash === "#reviews") {
      document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [profile]);
  
  const initial = (profile?.name?.trim()?.[0] || "U").toUpperCase();
  const memberSince = profile?.member_since
    ? formatDate(profile.member_since, "monthYear")
    : "";

  const getOccupationLabel = (occupation) => {
    if (!occupation) return "";
    const key = `profileView.occupations.${occupation}`;
    const translated = t(key);
    // Keep an understandable fallback if the API ever returns a new enum value.
    return translated === key ? occupationLabel(occupation) || occupation : translated;
  };

  return (
    <div className="page-shell">
      <AppNavbar />
      <section className="profile-page">
        <div className="profile-container">
          {error ? (
            <p className="profile-error">
              {error === "notFound" ? t("profileView.notFound") : t("profileView.loadFailed")}
            </p>
          ) : null}
          {!profile && !error ? <p>{t("profileView.loading")}</p> : null}

          {profile ? (
            <>
              <div className="profile-card pv-header">
                <Avatar
                  zoomable
                  className="profile-avatar profile-avatar-xl"
                  src={profile.profile_picture_url}
                  fallback={initial}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                />
                <div className="pv-header-text">
                  <h1>
                    {profile.name}
                    {profile.is_verified ? <span className="badge badge-success pv-badge">{t("status.verified")}</span> : null}
                  </h1>
                  <p className="pv-roles">
                    {profile.is_landlord ? <span className="badge badge-neutral">{t("role.landlord")}</span> : null}
                    {profile.is_tenant ? <span className="badge badge-neutral">{t("role.tenant")}</span> : null}
                    {memberSince ? <span>{t("profileView.memberSince", { date: memberSince })}</span> : null}
                  </p>
                  <p className="pv-rating">
                    <span aria-hidden="true">{stars(profile.average_rating)}</span>{" "}
                    {Number(profile.total_reviews) > 0
                      ? `${formatNumber(Number(profile.average_rating), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${t("profileView.reviewCount", { count: Number(profile.total_reviews) })}`
                      : t("profileView.noReviewsYet")}
                  </p>
                  {profile.is_self ? (
                    <Link className="btn btn-ghost btn-sm" to="/profile">
                      {t("profileView.editProfile")}
                    </Link>
                  ) : null}
                </div>
              </div>

              {profile.background ? (
                <div className="profile-card">
                  <h2>{t("profileView.background")}</h2>
                  <dl className="pv-details">
                    {profile.background.occupation ? (
                      <div>
                        <dt>{t("profileView.occupation")}</dt>
                        <dd>{getOccupationLabel(profile.background.occupation)}</dd>
                      </div>
                    ) : null}
                    {profile.background.institution_name ? (
                      <div>
                        <dt>{t("profileView.institution")}</dt>
                        <dd>{profile.background.institution_name}</dd>
                      </div>
                    ) : null}
                    {profile.background.workplace_name ? (
                      <div>
                        <dt>{profile.background.occupation === "businessman" ? t("profileView.business") : t("profileView.workplace")}</dt>
                        <dd>{profile.background.workplace_name}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>{t("profileView.monthlyIncome")}</dt>
                      <dd>
                        {profile.background.monthly_income != null
                          ? formatCurrency(Number(profile.background.monthly_income))
                          : t("profileView.notProvided")}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("profileView.familySize")}</dt>
                      <dd>
                        {profile.background.family_size != null
                          ? formatNumber(Number(profile.background.family_size))
                          : t("profileView.notProvided")}
                      </dd>
                    </div>
                  </dl>
                  {!profile.background.occupation && !profile.background.institution_name && !profile.background.workplace_name ? (
                    <p className="verification-note">{t("profileView.noBackground")}</p>
                  ) : null}
                </div>
              ) : null}

              {profile.contact ? (
                <div className="profile-card">
                  <h2>{t("profileView.contact")}</h2>
                  <dl className="pv-details">
                    <div>
                      <dt>{t("profileView.email")}</dt>
                      <dd>{profile.contact.email}</dd>
                    </div>
                    <div>
                      <dt>{t("profileView.phone")}</dt>
                      <dd>{profile.contact.contact_number}</dd>
                    </div>
                    {profile.contact.address ? (
                      <div>
                        <dt>{t("profileView.address")}</dt>
                        <dd>{translatedAddresses[profile.contact.address] || profile.contact.address}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}

              {profile.listings.length > 0 ? (
                <div className="profile-card">
                  <h2>{t("profileView.availableListings")}</h2>
                  <div className="pv-listings">
                    {profile.listings.map((listing) => {
                      const listingSpecs = [
                        listing.bedroom != null
                          ? t("profileView.bedCount", { count: Number(listing.bedroom) })
                          : null,
                        listing.bathroom != null
                          ? t("profileView.bathCount", { count: Number(listing.bathroom) })
                          : null,
                        listing.size_sqft
                          ? t("profileView.squareFeet", { count: Number(listing.size_sqft) })
                          : null,
                      ].filter(Boolean);
                      const listingAddress = translatedAddresses[listing.address] || listing.address;

                      return (
                        <Link key={listing.property_id} to={`/property/${listing.property_id}`} className="pv-listing">
                          {listing.cover_photo ? <img src={listing.cover_photo} alt="" /> : <div className="pv-listing-empty" />}
                          <strong>{t("profileView.monthlyRate", { price: formatCurrency(listing.rate) })}</strong>
                          <span>{listingAddress}</span>
                          <span>{listingSpecs.join(" · ")}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}

                <div className="profile-card" id="reviews">
                <h2>{t("profileView.reviews")}</h2>
                {canReview ? (
                  <ReviewForm
                    userId={profile.user_id}
                    revieweeName={profile.name}
                    onSubmitted={handleReviewSubmitted}
                    onIneligible={lockReviewForm}
                  />
                ) : null}
                {justReviewed ? <p className="verification-note">{t("profileView.reviewSubmitted")}</p> : null}
                {reviews.length === 0 ? (
                  <p className="verification-note">{t("profileView.noReviews")}</p>
                ) : (
                  <ul className="pv-reviews">
                    {reviews.map((review) => (
                      <li key={review.review_id}>
                        <div className="pv-review-head">
                          <strong>{review.reviewer_name}</strong>
                          <span aria-label={t("profileView.ratingOutOfFive", { rating: formatNumber(review.rating) })}>{stars(review.rating)}</span>
                          <time dateTime={review.created_at}>{formatDate(review.created_at, "medium")}</time>
                        </div>
                        {review.comment ? <p>{review.comment}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}