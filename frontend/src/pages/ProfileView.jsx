import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppNavbar from "../components/AppNavbar.jsx";
import { occupationLabel } from "../utils/occupations";
import api from "../services/api";

const formatMonthYear = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "";

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

const stars = (rating) => {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
};

export default function ProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setProfile(null);
    setReviews([]);
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
        else if (status === 404) setError("This profile doesn't exist.");
        else setError(err?.message || "Could not load this profile.");
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

  const initial = (profile?.name?.trim()?.[0] || "U").toUpperCase();

  return (
    <div className="page-shell">
      <AppNavbar />
      <section className="profile-page">
        <div className="profile-container">
          {error ? <p className="profile-error">{error}</p> : null}
          {!profile && !error ? <p>Loading profile...</p> : null}

          {profile ? (
            <>
              <div className="profile-card pv-header">
                {profile.profile_picture_url ? (
                  <img src={profile.profile_picture_url} alt="" className="profile-avatar profile-avatar-xl" referrerPolicy="no-referrer" />
                ) : (
                  <span className="profile-avatar profile-avatar-xl">{initial}</span>
                )}
                <div className="pv-header-text">
                  <h1>
                    {profile.name}
                    {profile.is_verified ? <span className="badge badge-success pv-badge">Verified</span> : null}
                  </h1>
                  <p className="pv-roles">
                    {profile.is_landlord ? <span className="badge badge-neutral">Landlord</span> : null}
                    {profile.is_tenant ? <span className="badge badge-neutral">Tenant</span> : null}
                    <span>Member since {formatMonthYear(profile.member_since)}</span>
                  </p>
                  <p className="pv-rating">
                    <span aria-hidden="true">{stars(profile.average_rating)}</span>{" "}
                    {profile.total_reviews > 0
                      ? `${profile.average_rating.toFixed(1)} · ${profile.total_reviews} review${profile.total_reviews === 1 ? "" : "s"}`
                      : "No reviews yet"}
                  </p>
                  {profile.is_self ? (
                    <Link className="btn btn-ghost btn-sm" to="/profile">
                      Edit profile
                    </Link>
                  ) : null}
                </div>
              </div>

              {profile.background ? (
                <div className="profile-card">
                  <h2>Background</h2>
                  <dl className="pv-details">
                    {profile.background.occupation ? (
                      <div>
                        <dt>Occupation</dt>
                        <dd>{occupationLabel(profile.background.occupation)}</dd>
                      </div>
                    ) : null}
                    {profile.background.institution_name ? (
                      <div>
                        <dt>Institution</dt>
                        <dd>{profile.background.institution_name}</dd>
                      </div>
                    ) : null}
                    {profile.background.workplace_name ? (
                      <div>
                        <dt>{profile.background.occupation === "businessman" ? "Business" : "Workplace"}</dt>
                        <dd>{profile.background.workplace_name}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {!profile.background.occupation && !profile.background.institution_name && !profile.background.workplace_name ? (
                    <p className="verification-note">No background details added yet.</p>
                  ) : null}
                </div>
              ) : null}

              {profile.contact ? (
                <div className="profile-card">
                  <h2>Contact</h2>
                  <dl className="pv-details">
                    <div>
                      <dt>Email</dt>
                      <dd>{profile.contact.email}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{profile.contact.contact_number}</dd>
                    </div>
                    {profile.contact.address ? (
                      <div>
                        <dt>Address</dt>
                        <dd>{profile.contact.address}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}

              {profile.listings.length > 0 ? (
                <div className="profile-card">
                  <h2>Available listings</h2>
                  <div className="pv-listings">
                    {profile.listings.map((listing) => (
                      <Link key={listing.property_id} to={`/property/${listing.property_id}`} className="pv-listing">
                        {listing.cover_photo ? <img src={listing.cover_photo} alt="" /> : <div className="pv-listing-empty" />}
                        <strong>৳{Number(listing.rate).toLocaleString()}/mo</strong>
                        <span>{listing.address}</span>
                        <span>
                          {[
                            listing.bedroom != null ? `${listing.bedroom} bed` : null,
                            listing.bathroom != null ? `${listing.bathroom} bath` : null,
                            listing.size_sqft ? `${Number(listing.size_sqft)} sqft` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="profile-card">
                <h2>Reviews</h2>
                {reviews.length === 0 ? (
                  <p className="verification-note">No reviews yet.</p>
                ) : (
                  <ul className="pv-reviews">
                    {reviews.map((review) => (
                      <li key={review.review_id}>
                        <div className="pv-review-head">
                          <strong>{review.reviewer_name}</strong>
                          <span aria-label={`${review.rating} out of 5`}>{stars(review.rating)}</span>
                          <time dateTime={review.created_at}>{formatDate(review.created_at)}</time>
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
