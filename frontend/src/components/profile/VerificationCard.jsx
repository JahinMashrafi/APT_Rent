import { useState } from "react";
import api from "../../services/api";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

const DOCS = {
  nid_photo: { column: "nid_photo_url", labelKey: "nid", hintKey: "nidHint" },
  student_id_card: { column: "student_id_card_url", labelKey: "studentId", hintKey: "studentIdHint" },
  job_id_card: { column: "job_id_card_url", labelKey: "jobId", hintKey: "jobIdHint" },
  trade_license: { column: "trade_license_url", labelKey: "tradeLicense", hintKey: "tradeLicenseHint" },
};

const STATUS = {
  verified: { labelKey: "statusVerified", className: "badge-success" },
  pending: { labelKey: "statusPending", className: "badge-warn" },
  rejected: { labelKey: "statusRejected", className: "badge-error" },
  not_submitted: { labelKey: "statusNotSubmitted", className: "badge-neutral" },
};

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function VerificationCard({ me, occupationChanged = false, onUpdated }) {
  const { t } = useLanguage();
  const verification = me.verification;
  const [files, setFiles] = useState({});
  const [inputKey, setInputKey] = useState(0); // remounting clears the file inputs
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const status = STATUS[verification.status] ?? STATUS.not_submitted;
  const required = verification.required_documents ?? [];
  const isVerified = verification.status === "verified";
  const hasFile = (field) => Boolean(me[DOCS[field].column]);
  const selected = Object.keys(files).length;
  const completesSet = required.every((field) => files[field] || hasFile(field));

  const handlePick = (field, event) => {
    const file = event.target.files?.[0];
    setError("");
    setMessage("");
    if (!file) {
      setFiles((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return;
    }
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setError(t("profileEdit.documentTypeError", { document: t(`profileEdit.documents.${DOCS[field].labelKey}`) }));
      event.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("profileEdit.documentSizeError", { document: t(`profileEdit.documents.${DOCS[field].labelKey}`) }));
      event.target.value = "";
      return;
    }
    setFiles((prev) => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async () => {
    const body = new FormData();
    Object.entries(files).forEach(([field, file]) => body.append(field, file));
    try {
      setBusy(true);
      setError("");
      setMessage("");
      const result = await api.users.uploadDocuments(body);
      setMessage(result.submitted ? t("profileEdit.documentsSubmitted") : t("profileEdit.documentsSavedRemaining"));
      setFiles({});
      setInputKey((k) => k + 1);
      onUpdated(result.user);
    } catch (err) {
      setError(err.details?.[0]?.issue || err.message || t("profileEdit.uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-card verification-card">
      <div className="verification-head">
        <div>
          <h2>{t("profileEdit.verificationTitle")}</h2>
          <p>{t("profileEdit.verificationSubtitle")}</p>
        </div>
        <span className={`badge ${status.className}`}>{t(`profileEdit.${status.labelKey}`)}</span>
      </div>

      {verification.status === "rejected" && (
        <p className="profile-error">
          {t("profileEdit.documentsRejected", { reason: verification.rejection_reason ? `: ${verification.rejection_reason}` : "." })}
        </p>
      )}
      {verification.status === "pending" && (
        <p className="verification-note">{t("profileEdit.documentsUnderReview")}</p>
      )}
      {isVerified && <p className="profile-success">{t("profileEdit.identityVerified")}</p>}

      {!verification.occupation_set ? (
        <p className="verification-note">
          {t("profileEdit.chooseOccupationFirst")}
        </p>
      ) : (
        <>
          {occupationChanged && !isVerified && (
            <p className="verification-note">{t("profileEdit.occupationChanged")}</p>
          )}

          <ul className="verification-docs">
            {required.map((field) => (
              <li key={field}>
                <div className="verification-doc-info">
                  <strong>{t(`profileEdit.documents.${DOCS[field].labelKey}`)}</strong>
                  <span>{t(`profileEdit.documents.${DOCS[field].hintKey}`)}</span>
                  {hasFile(field) ? (
                    <span className="doc-on-file">
                      ✓ {t("profileEdit.onFile")} 
                      <a href={me[DOCS[field].column]} target="_blank" rel="noopener noreferrer">
                        {t("profileEdit.viewDocument")}
                      </a>
                    </span>
                  ) : (
                    <span className="doc-missing">{t("profileEdit.notUploaded")}</span>
                  )}
                </div>
                {!isVerified && (
                  <label className="doc-picker">
                    <span className="btn btn-ghost">{hasFile(field) || files[field] ? t("profileEdit.replace") : t("profileEdit.chooseFile")}</span>
                    <input
                      key={`${field}-${inputKey}`}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={(event) => handlePick(field, event)}
                    />
                    {files[field] ? <span className="doc-filename">{files[field].name}</span> : null}
                  </label>
                )}
              </li>
            ))}
          </ul>

          {!isVerified && (
            <div className="profile-actions">
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={busy || selected === 0}>
                {busy ? t("profileEdit.uploading") : completesSet ? t("profileEdit.submitForReview") : t("profileEdit.saveDocuments")}
              </button>
            </div>
          )}
        </>
      )}

      {error ? <p className="profile-error">{error}</p> : null}
      {message ? <p className="profile-success">{message}</p> : null}
    </div>
  );
}
