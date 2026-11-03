import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { DISPUTE_PILL } from "../components/cases/caseUtils.js";
import api from "../services/api";
import { useApp } from "../context/AppContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import "../css/global.css";
import "../css/navbar.css";
import "../css/modules.css";

// Exact-record page for one dispute. Notifications deep-link here
// (/disputes/:id). Both parties see the same row; only an admin sees
// the resolve form (the API enforces that too).
export default function DisputeDetail() {
  const { id } = useParams();
  const { t, digits, formatDate } = useLanguage();
  const { currentUser, role } = useApp();
  const { showToast } = useToast();
  const [state, setState] = useState({ loading: true, dispute: null });
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    return api.disputes.get(id)
      .then((res) => setState({ loading: false, dispute: res?.data ?? null }))
      .catch(() => setState({ loading: false, dispute: null }));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const d = state.dispute;
  const back = currentUser?.isAdmin ? "/admin" : role === "landlord" ? "/landlord?tab=disputes" : "/tenant";

  const resolve = async (event) => {
    event.preventDefault();
    if (!notes.trim()) { setError(t("cases.detail.adminNoteReq")); return; }
    setSaving(true);
    setError("");
    try {
      await api.admin.resolveDispute(d.dispute_id, notes.trim());
      showToast({ message: t("cases.detail.resolvedToast"), type: "success" });
      setNotes("");
      await load();
    } catch (err) {
      setError(err?.message || t("cases.detail.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-shell">
      <AppNavbar />
      <main className="module-main">
        <Link to={back} className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> {t("cases.detail.back")}</Link>

        {state.loading ? <p className="fx-help" style={{ marginTop: 16 }}>{t("common.loading")}</p> : !d ? (
          <div className="mod-card mod-card-pad" style={{ marginTop: 16 }}><p>{t("cases.detail.notFound")}</p></div>
        ) : (
          <>
            <div className="case-section-head" style={{ marginTop: 16 }}>
              <h1 className="module-title">{t("cases.detail.disputeTitle", { id: digits(d.dispute_id) })}</h1>
              <span className="case-pills">
                {(d.created_by_me || d.against_me) && (
                  <span className={`pill ${d.created_by_me ? "pill-progress" : "pill-danger"}`}>
                    {d.created_by_me ? t("cases.byYou") : t("cases.againstYou")}
                  </span>
                )}
                <span className={`pill ${DISPUTE_PILL[d.status] ?? ""}`}>{t(`cases.status.${d.status}`)}</span>
              </span>
            </div>

            <div className="mod-card mod-card-pad">
              <dl className="case-field">
                <dt>{t("cases.detail.reasonLabel")}</dt>
                <dd><strong>{d.reason}</strong></dd>
              </dl>
              <dl className="case-field" style={{ marginTop: 12 }}>
                <dt>{t("cases.detail.detailsLabel")}</dt>
                <dd className="case-body">{d.details}</dd>
              </dl>
              <div className="case-detail-grid">
                <dl className="case-field">
                  <dt>{t("cases.detail.complainant")}</dt>
                  <dd><Link to={`/users/${d.complainant.user_id}`}>{d.complainant.name}</Link></dd>
                </dl>
                <dl className="case-field">
                  <dt>{t("cases.detail.reported")}</dt>
                  <dd><Link to={`/users/${d.reported_user.user_id}`}>{d.reported_user.name}</Link></dd>
                </dl>
                {d.property_id && (
                  <dl className="case-field">
                    <dt>{t("cases.detail.property")}</dt>
                    <dd><Link to={`/property/${d.property_id}`}>{d.property_address}</Link></dd>
                  </dl>
                )}
                {d.contract_id && (
                  <dl className="case-field">
                    <dt>{t("cases.detail.lease")}</dt>
                    <dd>#{digits(d.contract_id)} · <Link to="/contracts">{t("cases.detail.viewLease")}</Link></dd>
                  </dl>
                )}
              </div>
              <p className="case-meta" style={{ marginTop: 12 }}>{t("cases.detail.filedOn", { date: formatDate(d.created_at, "medium") })}</p>
            </div>

            {d.resolution_notes && (
              <div className="mod-card mod-card-pad" style={{ marginTop: 16 }}>
                <dl className="case-field">
                  <dt>{t("cases.detail.resolution")}</dt>
                  <dd className="case-body">{d.resolution_notes}</dd>
                </dl>
              </div>
            )}

            {d.status === "open" && (
              <div className="mod-card mod-card-pad" style={{ marginTop: 16 }}>
                {currentUser?.isAdmin ? (
                  <form className="case-form" onSubmit={resolve}>
                    <h2 className="section-heading" style={{ marginBottom: 0 }}>{t("cases.detail.adminResolve")}</h2>
                    <div className="mod-field">
                      <label className="mod-label" htmlFor="dsp-notes">{t("cases.detail.adminNote")}</label>
                      <textarea id="dsp-notes" className={`mod-input ${error ? "has-error" : ""}`} rows={4} value={notes} onChange={(e) => { setNotes(e.target.value); setError(""); }} />
                    </div>
                    {error && <p className="mod-error" role="alert">{error}</p>}
                    <button type="submit" className="btn btn-primary" disabled={saving}>{t("cases.detail.resolveBtn")}</button>
                  </form>
                ) : (
                  <p className="fx-help">{t("cases.detail.adminOnlyHint")}</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <footer className="site-footer"><div className="container"><p>{t("footer.brand")}</p></div></footer>
    </div>
  );
}