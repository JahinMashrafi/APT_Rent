import { useState } from "react";
import api from "../../services/api";

const DOCS = {
  nid_photo: { column: "nid_photo_url", label: "National ID (NID)", hint: "A clear photo or scan of your NID." },
  student_id_card: { column: "student_id_card_url", label: "Student ID card", hint: "Your current institution ID." },
  job_id_card: { column: "job_id_card_url", label: "Job ID card", hint: "Your current workplace ID." },
  trade_license: { column: "trade_license_url", label: "Trade license", hint: "A valid trade license for your business." },
};

const STATUS = {
  verified: { label: "Verified", className: "badge-success" },
  pending: { label: "Under review", className: "badge-warn" },
  rejected: { label: "Rejected", className: "badge-error" },
  not_submitted: { label: "Not submitted", className: "badge-neutral" },
};

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function VerificationCard({ me, occupationChanged = false, onUpdated }) {
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
      setError(`${DOCS[field].label}: use a JPG, PNG, WebP or PDF file.`);
      event.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`${DOCS[field].label}: the file must be 5 MB or smaller.`);
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
      setMessage(result.message);
      setFiles({});
      setInputKey((k) => k + 1);
      onUpdated(result.user);
    } catch (err) {
      setError(err.details?.[0]?.issue || err.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-card verification-card">
      <div className="verification-head">
        <div>
          <h2>Identity verification</h2>
          <p>Verified accounts build trust with landlords and tenants.</p>
        </div>
        <span className={`badge ${status.className}`}>{status.label}</span>
      </div>

      {verification.status === "rejected" && (
        <p className="profile-error">
          Your documents were rejected{verification.rejection_reason ? `: ${verification.rejection_reason}` : "."} Upload
          corrected documents to submit again.
        </p>
      )}
      {verification.status === "pending" && (
        <p className="verification-note">Your documents are with our team for review. You can replace a document if needed.</p>
      )}
      {isVerified && <p className="profile-success">Your identity has been verified. Thank you!</p>}

      {!verification.occupation_set ? (
        <p className="verification-note">
          Choose your occupation above and save your changes. We'll then show exactly which documents you need.
        </p>
      ) : (
        <>
          {occupationChanged && !isVerified && (
            <p className="verification-note">You changed your occupation. Save your profile to update the required documents.</p>
          )}

          <ul className="verification-docs">
            {required.map((field) => (
              <li key={field}>
                <div className="verification-doc-info">
                  <strong>{DOCS[field].label}</strong>
                  <span>{DOCS[field].hint}</span>
                  {hasFile(field) ? (
                    <span className="doc-on-file">
                      ✓ On file{" "}
                      <a href={me[DOCS[field].column]} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </span>
                  ) : (
                    <span className="doc-missing">Not uploaded yet</span>
                  )}
                </div>
                {!isVerified && (
                  <label className="doc-picker">
                    <span className="btn btn-ghost">{hasFile(field) || files[field] ? "Replace" : "Choose file"}</span>
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
                {busy ? "Uploading..." : completesSet ? "Submit for review" : "Save documents"}
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
