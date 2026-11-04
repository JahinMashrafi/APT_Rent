import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { MAINT_PILL, PRIORITY_PILL } from "../components/cases/caseUtils.js";
import api from "../services/api";
import { useApp } from "../context/AppContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import "../css/global.css";
import "../css/navbar.css";
import "../css/modules.css";

// Exact-record page for one maintenance request / notice (/maintenance/:id).
// Both parties read the same row; the API says which status moves the
// viewer may make (allowed_statuses), and this page just renders them.
export default function MaintenanceDetail() {
  const { id } = useParams();
  const { t, digits, formatDate } = useLanguage();
  const { currentUser, role } = useApp();
  const { showToast } = useToast();
  const [state, setState] = useState({ loading: true, record: null });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    return api.maintenance.get(id)
      .then((res) => setState({ loading: false, record: res?.data ?? null }))
      .catch(() => setState({ loading: false, record: null }));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const m = state.record;
  const back = currentUser?.isAdmin ? "/admin" : role === "landlord" ? "/landlord?tab=maintenance" : "/tenant";

  const move = async (status) => {
    setSaving(true);
    setError("");
    try {
      await api.maintenance.updateStatus(m.maintenance_id, { status, response_notes: note.trim() || undefined });
      showToast({ message: t("cases.detail.updated"), type: "success" });
      setNote("");
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

        {state.loading ? <p className="fx-help" style={{ marginTop: 16 }}>{t("common.loading")}</p> : !m ? (
          <div className="mod-card mod-card-pad" style={{ marginTop: 16 }}><p>{t("cases.detail.notFound")}</p></div>
        ) : (
          <>
            <div className="case-section-head" style={{ marginTop: 16 }}>
              <h1 className="module-title">
                {t("cases.detail.maintTitle", {
                  kind: t(m.kind === "notice" ? "cases.maint.kindNotice" : "cases.maint.kindRequest"),
                  id: digits(m.maintenance_id),
                })}
              </h1>
              <span className="case-pills">
                {(m.created_by_me || m.for_me) && (
                  <span className={`pill ${m.created_by_me ? "pill-progress" : "pill-danger"}`}>
                    {m.created_by_me ? t("cases.byYou") : t("cases.toYou")}
                  </span>
                )}
                <span className={`pill ${PRIORITY_PILL[m.priority] ?? ""}`}>{t(`cases.maint.priorityLevel.${m.priority}`)}</span>
                <span className={`pill ${MAINT_PILL[m.status] ?? ""}`}>{t(`cases.maint.status.${m.status}`)}</span>
              </span>
            </div>

            <div className="mod-card mod-card-pad">
              <dl className="case-field">
                <dt>{t("cases.maint.titleField")}</dt>
                <dd><strong>{m.title}</strong></dd>
              </dl>
              <dl className="case-field" style={{ marginTop: 12 }}>
                <dt>{t("cases.maint.description")}</dt>
                <dd className="case-body">{m.description}</dd>
              </dl>
              <div className="case-detail-grid">
                <dl className="case-field">
                  <dt>{t("cases.detail.createdBy")}</dt>
                  <dd><Link to={`/users/${m.created_by.user_id}`}>{m.created_by.name}</Link></dd>
                </dl>
                <dl className="case-field">
                  <dt>{t("cases.detail.recipient")}</dt>
                  <dd><Link to={`/users/${m.recipient.user_id}`}>{m.recipient.name}</Link></dd>
                </dl>
                <dl className="case-field">
                  <dt>{t("cases.detail.property")}</dt>
                  <dd><Link to={`/property/${m.property_id}`}>{m.property_address}</Link></dd>
                </dl>
                <dl className="case-field">
                  <dt>{t("cases.detail.lease")}</dt>
                  <dd>#{digits(m.contract_id)} · <Link to="/contracts">{t("cases.detail.viewLease")}</Link></dd>
                </dl>
                {m.scheduled_date && (
                  <dl className="case-field">
                    <dt>{t("cases.maint.scheduledLabel")}</dt>
                    <dd>{formatDate(`${m.scheduled_date}T00:00:00`, "medium")}</dd>
                  </dl>
                )}
              </div>
              <p className="case-meta" style={{ marginTop: 12 }}>{t("cases.detail.createdOn", { date: formatDate(m.created_at, "medium") })}</p>
            </div>

            {m.response_notes && (
              <div className="mod-card mod-card-pad" style={{ marginTop: 16 }}>
                <dl className="case-field">
                  <dt>{t("cases.detail.responseNotes")}</dt>
                  <dd className="case-body">{m.response_notes}</dd>
                </dl>
              </div>
            )}

            {m.allowed_statuses.length > 0 && (
              <div className="mod-card mod-card-pad" style={{ marginTop: 16 }}>
                <h2 className="section-heading" style={{ marginBottom: 8 }}>{t("cases.detail.actions")}</h2>
                <div className="mod-field">
                  <label className="mod-label" htmlFor="mnt-note">{t("cases.detail.noteLabel")}</label>
                  <textarea id="mnt-note" className="mod-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                {error && <p className="mod-error" role="alert">{error}</p>}
                <div className="case-actions">
                  {m.allowed_statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`btn btn-sm ${status === "cancelled" ? "btn-ghost" : "btn-primary"}`}
                      disabled={saving}
                      onClick={() => move(status)}
                    >
                      {t(`cases.detail.act.${status}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="site-footer"><div className="container"><p>{t("footer.brand")}</p></div></footer>
    </div>
  );
}