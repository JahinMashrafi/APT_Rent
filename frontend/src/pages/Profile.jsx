import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppNavbar from "../components/AppNavbar.jsx";
import VerificationCard from "../components/profile/VerificationCard.jsx";
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
});

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
              {pictureUrl ? (
                <img src={pictureUrl} alt={t("profileEdit.profilePhotoAlt")} className="profile-avatar profile-avatar-lg" referrerPolicy="no-referrer" />
              ) : (
                <span className="profile-avatar profile-avatar-lg">{avatarInitial}</span>
              )}
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
        </div>
      </section>
    </div>
  );
}
