import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../components/AppNavbar.jsx";
import { registerUser } from "../utils/auth";
import api from "../services/api";
import { useApp } from "../context/AppContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function Register() {
  const { t } = useLanguage();
  const [role, setRole] = useState("tenant");
  const [occupation, setOccupation] = useState("");
  const [formData, setFormData] = useState({
    fullName: "", userId: "", phone: "", email: "", password: "", confirmPassword: "", address: ""
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [nidPhoto, setNidPhoto] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { applyAuthenticatedUser } = useApp();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // Basic front-end validation similar to original HTML preview
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword || !occupation) {
      setError(t("register.errRequired"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("register.errMismatch"));
      return;
    }

    try {
      setIsSubmitting(true);
      // Matches the POST /auth/register body in the API spec exactly.
      const payload = {
        name: formData.fullName.trim(),
        email: formData.email,
        password: formData.password,
        contact_number: formData.phone,
        address: formData.address,
        occupation,
        is_tenant: role === "tenant",
        is_landlord: role === "landlord",
      };

      // Same as Login: the auth cookie is httpOnly, so context needs the
      // user handed to it or guarded routes redirect back to /login.
      const user = await registerUser(payload);
      if (profilePhoto || nidPhoto) {
        const documents = new FormData();
        if (nidPhoto) documents.append("nid_photo", nidPhoto);
        try {
          if (nidPhoto) await api.users.uploadDocuments(documents);
          if (profilePhoto) await api.users.uploadAvatar(profilePhoto);
        } catch (uploadError) {
          setError(t("register.errUpload", { message: uploadError.message }));
          applyAuthenticatedUser(user);
          navigate("/dashboard");
          return;
        }
      }
      applyAuthenticatedUser(user);
      navigate("/dashboard");
    } catch (err) {
      const detail = err.details?.find?.((item) => item.issue)?.issue;
      const base = err.message || t("register.errGeneric");
      setError(detail ? `${base}: ${detail}` : base);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <AppNavbar />

      {/* AUTH LAYOUT */}
      <main className="auth-shell">
        <section className="auth-brand">
          <a href="/" className="brand">
            <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="brand-logo" />
            <span className="brand-name">APT<span> Rent</span></span>
          </a>

          <div className="auth-brand-copy">
            <span className="eyebrow">{t("register.eyebrowJoin")}</span>
            <h2>{t("register.tagline")}</h2>
            <p>{t("register.intro")}</p>
            <ul className="auth-brand-list">
              <li>{t("register.bullet1")}</li>
              <li>{t("register.bullet2")}</li>
              <li>{t("register.bullet3")}</li>
            </ul>
          </div>

          <p className="auth-brand-foot">{t("register.brandFoot")}</p>
        </section>

        <section className="auth-form-panel">
          <div className="auth-card auth-card-wide corner-marks">
            <header>
              <span className="eyebrow">{t("register.eyebrow")}</span>
              <h1>{t("register.title")}</h1>
              <p>{t("register.subtitle")}</p>
            </header>

            <div className="role-tabs" role="tablist" aria-label={t("register.registerAs")}>
              <div className="role-tab" role="tab" aria-selected={role === 'tenant'} data-role="tenant" tabIndex={0} onClick={() => setRole('tenant')}>{t("register.imTenant")}</div>
              <div className="role-tab" role="tab" aria-selected={role === 'landlord'} data-role="landlord" tabIndex={0} onClick={() => setRole('landlord')}>{t("register.imLandlord")}</div>
            </div>

            <form id="registerForm" className="form-grid" onSubmit={handleRegister} noValidate>
              <input type="hidden" id="selectedRole" name="role" value={role} />

              <div className="form-row-2">
                <div className="field" data-field="fullName" data-required="true">
                  <label htmlFor="fullName">{t("register.fullName")} <span className="req">*</span></label>
                  <div className="input-shell">
                    <img src="/assets/icons/user.svg" alt="" />
                    <input type="text" id="fullName" name="fullName" placeholder={t("register.fullNamePlaceholder")} value={formData.fullName} onChange={handleInputChange} />
                  </div>
                  <span className="field-error"></span>
                </div>

                <div className="field" data-field="userId">
                  <label htmlFor="userId">{t("register.userId")} <span className="hint">{t("register.autoGenerated")}</span></label>
                  <div className="input-shell disabled">
                    <input type="text" id="userId" name="userId" value={formData.userId || t("register.userIdPlaceholder")} disabled />
                  </div>
                </div>
              </div>

              <div className="form-row-2">
                <div className="field" data-field="profilePhoto">
                  <label htmlFor="profilePhoto">{t("register.profilePicture")}</label>
                  <label className="upload-zone" htmlFor="profilePhoto">
                    <img src="/assets/icons/upload.svg" alt="" />
                    <span className="upload-copy">
                      <strong>{t("register.uploadPhoto")}</strong>
                      <span>{t("register.photoHint")}</span>
                    </span>
                    <span className="file-name"></span>
                    <input type="file" id="profilePhoto" name="profilePhoto" accept="image/*" onChange={(e) => setProfilePhoto(e.target.files?.[0] ?? null)} />
                  </label>
                </div>

                <div className="field" data-field="nidPhoto">
                  <label htmlFor="nidPhoto">{t("register.nidPhoto")} <span className="req"></span></label>
                  <label className="upload-zone" htmlFor="nidPhoto">
                    <img src="/assets/icons/upload.svg" alt="" />
                    <span className="upload-copy">
                      <strong>{t("register.uploadNid")}</strong>
                      <span>{t("register.nidHint")}</span>
                    </span>
                    <span className="file-name"></span>
                    <input type="file" id="nidPhoto" name="nidPhoto" accept="image/*" onChange={(e) => setNidPhoto(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </div>

              <div className="field" data-field="address" data-required="true">
                <label htmlFor="address">{t("register.address")} <span className="req"></span></label>
                <div className="input-shell">
                  <input type="text" id="address" name="address" placeholder={t("register.addressPlaceholder")} value={formData.address} onChange={handleInputChange} />
                </div>
                <span className="field-error"></span>
              </div>

              <div className="field" data-field="occupation" data-required="true">
                <label htmlFor="occupation">{t("register.occupation")} <span className="req">*</span></label>
                <div className="input-shell">
                  <select id="occupation" name="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)}>
                    <option value="" disabled>{t("register.selectOccupation")}</option>
                    <option value="student">{t("register.occupations.student")}</option>
                    <option value="service_holder">{t("register.occupations.service_holder")}</option>
                    <option value="businessman">{t("register.occupations.businessman")}</option>
                  </select>
                </div>
                <span className="field-error"></span>
              </div>

              {/* Student fields (example) */}
              {occupation === 'student' && (
                <div className="occupation-fields" data-occupation-group="student">
                  <div className="field" data-field="institution">
                    <label htmlFor="institution">{t("register.institution")}</label>
                    <div className="input-shell">
                      <input type="text" id="institution" name="institution" placeholder={t("register.institutionPlaceholder")} />
                    </div>
                  </div>
                  <div className="field" data-field="studentIdCard">
                    <label htmlFor="studentIdCard">{t("register.studentIdCard")}</label>
                    <label className="upload-zone" htmlFor="studentIdCard">
                      <img src="/assets/icons/upload.svg" alt="" />
                      <span className="upload-copy"><strong>{t("register.uploadIdCard")}</strong><span>{t("register.idCardHint")}</span></span>
                      <span className="file-name"></span>
                      <input type="file" id="studentIdCard" name="studentIdCard" accept="image/*,.pdf" />
                    </label>
                  </div>
                </div>
              )}

              <div className="form-row-2">
                <div className="field" data-field="phone" data-required="true">
                  <label htmlFor="phone">{t("register.phone")} <span className="req">*</span></label>
                  <div className="input-shell">
                    <input type="tel" id="phone" name="phone" placeholder={t("register.phonePlaceholder")} value={formData.phone} onChange={handleInputChange} />
                  </div>
                  <span className="field-error"></span>
                </div>

                <div className="field" data-field="email" data-required="true">
                  <label htmlFor="registerEmail">{t("register.email")} <span className="req">*</span></label>
                  <div className="input-shell">
                    <img src="/assets/icons/email.svg" alt="" />
                    <input type="email" id="registerEmail" name="email" placeholder={t("register.emailPlaceholder")} value={formData.email} onChange={handleInputChange} />
                  </div>
                  <span className="field-error"></span>
                </div>
              </div>

              <div className="form-row-2">
                {/* Password field with working visibility toggle */}
                <div className="field" data-field="password" data-required="true">
                  <label htmlFor="registerPassword">{t("register.password")} <span className="req">*</span></label>
                  <div className="input-shell">
                    <img src="/assets/icons/lock.svg" alt="" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="registerPassword"
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      className="toggle-visibility"
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      <img
                        className="icon-show"
                        src="/assets/icons/eye.svg"
                        alt=""
                        style={{ display: showPassword ? "none" : "block" }}
                      />
                      <img
                        className="icon-hide"
                        src="/assets/icons/eye-off.svg"
                        alt=""
                        style={{ display: showPassword ? "block" : "none" }}
                      />
                    </button>
                  </div>
                  <span className="field-error"></span>
                </div>

                {/* Confirm Password field with working visibility toggle */}
                <div className="field" data-field="confirmPassword" data-required="true">
                  <label htmlFor="registerConfirmPassword">{t("register.confirmPassword")} <span className="req">*</span></label>
                  <div className="input-shell">
                    <img src="/assets/icons/lock.svg" alt="" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="registerConfirmPassword"
                      name="confirmPassword"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      className="toggle-visibility"
                      aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      <img
                        className="icon-show"
                        src="/assets/icons/eye.svg"
                        alt=""
                        style={{ display: showConfirmPassword ? "none" : "block" }}
                      />
                      <img
                        className="icon-hide"
                        src="/assets/icons/eye-off.svg"
                        alt=""
                        style={{ display: showConfirmPassword ? "block" : "none" }}
                      />
                    </button>
                  </div>
                  <span className="field-error"></span>
                </div>
              </div>

              <label className="field-checkbox">
                <input type="checkbox" id="confirmAccurate" name="confirmAccurate" />
                {t("register.confirmAccurate")}
              </label>

              <label className="field-checkbox" id="agreeTermsWrap">
                <input type="checkbox" id="agreeTerms" name="agreeTerms" />
                {t("register.agreePrefix")} <a href="#">{t("register.terms")}</a> {t("register.and")} <a href="#">{t("register.privacy")}</a>{t("register.agreeSuffix")}
              </label>

              <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                {isSubmitting ? t("register.submitting") : t("register.submit")}
              </button>
              {error ? <p className="form-note" style={{ color: "var(--color-error)" }}>{error}</p> : null}
              <p className="form-note">{t("register.previewNote")}</p>
            </form>

            <div className="auth-switch">
              {t("register.haveAccount")} <a href="/login">{t("auth.login")}</a>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}