import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppNavbar from "../components/AppNavbar.jsx";
import VerificationCard from "../components/profile/VerificationCard.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import ImageLightbox from "../components/ui/ImageLightbox.jsx";
import { logoutUser, normalizeUserPayload } from "../utils/auth";
import { OCCUPATIONS, takesInstitution, takesWorkplace } from "../utils/occupations";
import { useApp } from "../context/AppContext.jsx";
import api from "../services/api";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const toFormState = (user) => ({
  name: user?.name ?? "",
  email: user?.email ?? "",
  contact_number: user?.contact_number ?? "",
  address: user?.address ?? "",
  occupation: user?.occupation ?? "",
  institution_name: user?.institution_name ?? "",
  workplace_name: user?.workplace_name ?? "",
  monthly_income: user?.monthly_income ?? "",
  family_size: user?.family_size ?? "",
});

// Verification documents shown at the bottom of the profile.
const DOC_LIST = [
  { column: "nid_photo_url", labelKey: "nid" },
  { column: "student_id_card_url", labelKey: "studentId" },
  { column: "job_id_card_url", labelKey: "jobId" },
  { column: "trade_license_url", labelKey: "tradeLicense" },
];
const isPdfUrl = (url) => /\.pdf($|\?)/i.test(String(url || "").split("#")[0]);

const errorMessage = (err, fallback) => err?.details?.[0]?.issue || err?.message || fallback;

export default function Profile() {
  const { role, clearSession, applyAuthenticatedUser, switchRole } = useApp();
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [me, setMe] = useState(null);
  const [form, setForm] = useState(() => toFormState(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [docPreview, setDocPreview] = useState(null); // { url, label }

  // Keep the navbar (which reads the app context) in step with what was just saved,
  // without disturbing the role the person is currently viewing the app as.
  const syncContext = useCallback(
    (data) => {
      const currentRole = role;
      applyAuthenticatedUser(normalizeUserPayload(data));
      switchRole(currentRole);
    },
    [role, applyAuthenticatedUser, switchRole],
  );

  useEffect(() => {
    let alive = true;
    api.users
      .getMe()
      .then((data) => {
        if (!alive) return;
        setMe(data);
        setForm(toFormState(data));
      })
      .catch((err) => {
        if (!alive) return;
        const status = err?.status ?? err?.response?.status;
        if (status === 401 || status === 403) navigate("/login");
        else setError(errorMessage(err, tRef.current("profileEdit.loadError")));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [navigate]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = {
        name: form.name,
        contact_number: form.contact_number,
        address: form.address,
        occupation: form.occupation,
        monthly_income: form.monthly_income === "" ? null : Number(form.monthly_income),
        family_size: form.family_size === "" ? null : Number(form.family_size),
      };
      if (takesInstitution(form.occupation)) payload.institution_name = form.institution_name;
      if (takesWorkplace(form.occupation)) payload.workplace_name = form.workplace_name;

      const updated = await api.users.updateMe(payload);
      setMe(updated);
      setForm(toFormState(updated));
      syncContext(updated);
      setSuccess(t("profileEdit.updateSuccess"));
    } catch (err) {
      setError(errorMessage(err, t("profileEdit.updateError")));
    } finally {
      setSaving(false);
    }
  };

  const applyAvatar = (profile_picture_url) => {
    const next = { ...me, profile_picture_url };
    setMe(next);
    syncContext(next);
  };

  const handleAvatarPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the same file be chosen again later
    if (!file) return;
    setAvatarError("");
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError(t("profileEdit.avatarTypeError"));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError(t("profileEdit.avatarSizeError"));
      return;
    }
    try {
      setAvatarBusy(true);
      const body = new FormData();
      body.append("avatar", file);
      const result = await api.users.uploadAvatar(body);
      applyAvatar(result.profile_picture_url);
    } catch (err) {
      setAvatarError(errorMessage(err, t("profileEdit.avatarUploadError")));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!window.confirm(t("profileEdit.removePhotoConfirm"))) return;
    try {
      setAvatarBusy(true);
      setAvatarError("");
      await api.users.removeAvatar();
      applyAvatar(null);
    } catch (err) {
      setAvatarError(errorMessage(err, t("profileEdit.avatarRemoveError")));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      clearSession();
      navigate("/login");
    }
  };

  const avatarInitial = (form.name?.trim()?.[0] || "U").toUpperCase();
  const pictureUrl = me?.profile_picture_url;

  return (
    <div className="page-shell">
      <AppNavbar />
      <section className="profile-page">
        <div className="profile-container">
          <div className="profile-card">
            <div className="profile-header">
              <Avatar
                zoomable
                className="profile-avatar profile-avatar-lg"
                src={pictureUrl}
                fallback={avatarInitial}
                alt={t("profileEdit.profilePhotoAlt")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
              />
              <div className="profile-header-text">
                <h1>{t("profileEdit.title")}</h1>
                <p>{t("profileEdit.subtitle")}</p>
                <div className="avatar-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarPick}
                    hidden
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarBusy || loading}
                  >
                    {avatarBusy ? t("profileEdit.working") : pictureUrl ? t("profileEdit.changePhoto") : t("profileEdit.uploadPhoto")}
                  </button>
                  {pictureUrl ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleAvatarRemove} disabled={avatarBusy}>
                      {t("profileEdit.remove")}
                    </button>
                  ) : null}
                </div>
                {avatarError ? <p className="profile-error">{avatarError}</p> : null}
              </div>
            </div>

            {me ? (
              <div className="profile-summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", margin: "0 0 1.25rem" }}>
                {[
                  [t("profileEdit.occupation"), me.occupation ? t(`profileEdit.occupations.${me.occupation}`) : t("profileEdit.notProvided")],
                  [t("profileEdit.monthlyIncome"), me.monthly_income != null && me.monthly_income !== "" ? `৳${Number(me.monthly_income).toLocaleString("en-BD")}` : t("profileEdit.notProvided")],
                  [t("profileEdit.familySize"), me.family_size != null && me.family_size !== "" ? String(me.family_size) : t("profileEdit.notProvided")],
                ].map(([label, value]) => (
                  <div key={label} style={{ border: "1px solid var(--color-line)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-charcoal)" }}>{label}</div>
                    <div style={{ fontWeight: 600, color: "var(--color-text-strong)", marginTop: "2px" }}>{value}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {loading ? <p>{t("profileEdit.loading")}</p> : null}
            {error ? <p className="profile-error">{error}</p> : null}
            {success ? <p className="profile-success">{success}</p> : null}

            <form className="profile-grid" onSubmit={handleUpdateProfile}>
              <label className="field">
                <span>{t("profileEdit.name")}</span>
                <input type="text" name="name" value={form.name} onChange={handleInputChange} required />
              </label>
              <label className="field">
                <span>{t("profileEdit.email")}</span>
                <input type="email" name="email" value={form.email} readOnly disabled />
                <small className="field-hint">{t("profileEdit.emailCannotChange")}</small>
              </label>
              <label className="field">
                <span>{t("profileEdit.contactNumber")}</span>
                <input type="text" name="contact_number" value={form.contact_number} onChange={handleInputChange} required />
              </label>
              <label className="field">
                <span>{t("profileEdit.occupation")}</span>
                <select name="occupation" value={form.occupation} onChange={handleInputChange}>
                  <option value="">{t("profileEdit.selectOccupation")}</option>
                  {OCCUPATIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(`profileEdit.occupations.${o.value}`)}
                    </option>
                  ))}
                </select>
              </label>

              {takesInstitution(form.occupation) ? (
                <label className="field">
                  <span>{t("profileEdit.institutionName")}</span>
                  <input
                    type="text"
                    name="institution_name"
                    value={form.institution_name}
                    onChange={handleInputChange}
                    placeholder={t("profileEdit.institutionPlaceholder")}
                  />
                </label>
              ) : null}
              {takesWorkplace(form.occupation) ? (
                <label className="field">
                  <span>{form.occupation === "businessman" ? t("profileEdit.businessName") : t("profileEdit.workplace")}</span>
                  <input
                    type="text"
                    name="workplace_name"
                    value={form.workplace_name}
                    onChange={handleInputChange}
                    placeholder={form.occupation === "businessman" ? t("profileEdit.businessPlaceholder") : t("profileEdit.workplacePlaceholder")}
                  />
                </label>
              ) : null}

              <label className="field">
                <span>{t("profileEdit.monthlyIncome")}</span>
                <input type="number" name="monthly_income" min="0" step="any" value={form.monthly_income} onChange={handleInputChange} />
              </label>
              <label className="field">
                <span>{t("profileEdit.familySize")}</span>
                <input type="number" name="family_size" min="1" max="50" step="1" value={form.family_size} onChange={handleInputChange} />
              </label>

              <label className="field field-wide">
                <span>{t("profileEdit.address")}</span>
                <input type="text" name="address" value={form.address} onChange={handleInputChange} />
              </label>

              <div className="profile-actions">
                <button type="submit" className="btn btn-primary" disabled={saving || loading}>
                  {saving ? t("profileEdit.saving") : t("profileEdit.saveChanges")}
                </button>
                {me ? (
                  <Link className="btn btn-ghost" to={`/users/${me.user_id}`}>
                    {t("profileEdit.viewPublicProfile")}
                  </Link>
                ) : null}
                <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                  {t("user.logout")}
                </button>
              </div>
            </form>
          </div>

          {me ? (
            <VerificationCard
              me={me}
              occupationChanged={form.occupation !== (me.occupation ?? "")}
              onUpdated={(user) => setMe((prev) => ({ ...prev, ...user }))}
            />
          ) : null}

          {me ? (
            <div className="profile-card" style={{ marginTop: "1.5rem" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", margin: "0 0 12px" }}>
                {t("profileEdit.myDocuments")}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                {DOC_LIST.filter(
                  (doc) => me[doc.column] || (me.verification?.required_documents ?? []).some((r) => DOC_LIST.find((d) => d.column === `${r}_url`)?.column === doc.column),
                ).map((doc) => {
                  const url = me[doc.column];
                  const label = t(`profileEdit.documents.${doc.labelKey}`);
                  return (
                    <div key={doc.column} style={{ border: "1px solid var(--color-line)", borderRadius: "var(--radius-sm)", padding: "10px" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "8px" }}>{label}</div>
                      {!url ? (
                        <div style={{ height: "120px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-paper-dim)", fontSize: "0.8rem", color: "var(--color-charcoal)" }}>
                          {t("profileEdit.notUploaded")}
                        </div>
                      ) : isPdfUrl(url) ? (
                        <a href={url} target="_blank" rel="noreferrer" style={{ display: "flex", height: "120px", alignItems: "center", justifyContent: "center", background: "var(--color-paper-dim)", fontSize: "0.85rem" }}>
                          {t("profileEdit.openPdf")}
                        </a>
                      ) : (
                        <img
                          src={url}
                          alt={label}
                          onClick={() => setDocPreview({ url, label })}
                          style={{ width: "100%", height: "120px", objectFit: "cover", cursor: "zoom-in", background: "var(--color-paper-dim)" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {docPreview ? <ImageLightbox src={docPreview.url} alt={docPreview.label} onClose={() => setDocPreview(null)} /> : null}
        </div>
      </section>
    </div>
  );
}