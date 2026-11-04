import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Wrench } from "lucide-react";
import Modal from "../ui/Modal.jsx";
import { useToast } from "../ui/Toast.jsx";
import api from "../../services/api";
import { useApp } from "../../context/AppContext.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { MAINT_PILL, PRIORITY_PILL, contractsForRole, counterpartyOf } from "./caseUtils.js";

/**
 * Maintenance section. Tenants see "Maintenance requests" (their own, plus
 * notices their landlord sent); landlords see "Maintenance notices" (their
 * own, plus requests from tenants). It is one shared record either way:
 * the lease decides who the recipient is.
 */
export default function MaintenancePanel({ role }) {
  const { t, digits, formatDate } = useLanguage();
  const { currentUser } = useApp();
  const { showToast } = useToast();
  const isLandlord = role === "landlord";
  const [items, setItems] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const blank = { contract_id: "", title: "", description: "", priority: "medium", scheduled_date: "" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.maintenance.list().then((res) => setItems(res?.data ?? [])).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
    api.contracts.list().then((res) => setContracts(res?.data ?? [])).catch(() => setContracts([]));
  }, [load]);

  // Maintenance only makes sense on a live lease.
  const myLeases = useMemo(
    () => contractsForRole(contracts, currentUser?.id, role, ["active"]),
    [contracts, currentUser?.id, role],
  );
  const shown = (items ?? []).filter((m) => filter === "all" || (filter === "mine" ? m.created_by_me : m.for_me));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.contract_id || !form.title.trim() || !form.description.trim()) {
      setError(t("cases.maint.failed"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.maintenance.create({
        contract_id: Number(form.contract_id),
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        ...(isLandlord && form.scheduled_date ? { scheduled_date: form.scheduled_date } : {}),
      });
      showToast({ message: t("cases.maint.created"), type: "success" });
      setOpen(false);
      setForm(blank);
      load();
    } catch (err) {
      setError(err?.message || t("cases.maint.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="case-section" id="maintenance">
      <div className="case-section-head">
        <div>
          <h2>{t(isLandlord ? "cases.maint.titleLandlord" : "cases.maint.titleTenant")}</h2>
          <p className="fx-help">{t(isLandlord ? "cases.maint.introLandlord" : "cases.maint.introTenant")}</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { setError(""); setOpen(true); }}>
          <Plus size={14} /> {t(isLandlord ? "cases.maint.newLandlord" : "cases.maint.newTenant")}
        </button>
      </div>

      <div className="case-filters">
        {["all", "mine", "forMe"].map((key) => (
          <button key={key} type="button" className={`pill-tab ${filter === key ? "is-active" : ""}`} onClick={() => setFilter(key)}>
            {t(`cases.filter.${key}`)}
          </button>
        ))}
      </div>

      <div className="mod-card">
        {items === null ? (
          <p className="fx-help" style={{ padding: 16 }}>{t("common.loading")}</p>
        ) : shown.length === 0 ? (
          <div className="fx-empty" style={{ padding: "1.5rem" }}>
            <Wrench size={32} aria-hidden="true" />
            <p>{items.length === 0 ? t("cases.maint.empty") : t("cases.emptyFiltered")}</p>
          </div>
        ) : (
          <ul className="case-list">
            {shown.map((m) => {
              const other = m.created_by_me ? m.recipient : m.created_by;
              return (
                <li key={m.maintenance_id} className="case-item">
                  <Link to={`/maintenance/${m.maintenance_id}`} className="case-link">
                    <div className="case-head">
                      <strong>#{digits(m.maintenance_id)} · {m.title}</strong>
                      <span className="case-pills">
                        <span className="pill">{t(m.kind === "notice" ? "cases.maint.kindNotice" : "cases.maint.kindRequest")}</span>
                        <span className={`pill ${m.created_by_me ? "pill-progress" : "pill-danger"}`}>
                          {m.created_by_me ? t("cases.byYou") : t("cases.toYou")}
                        </span>
                        <span className={`pill ${PRIORITY_PILL[m.priority] ?? ""}`}>{t(`cases.maint.priorityLevel.${m.priority}`)}</span>
                        <span className={`pill ${MAINT_PILL[m.status] ?? ""}`}>{t(`cases.maint.status.${m.status}`)}</span>
                      </span>
                    </div>
                    <p className="case-sub">
                      {m.created_by_me ? t("cases.maint.to") : t("cases.maint.from")}: {other?.name} · {m.property_address}
                    </p>
                    <p className="case-meta">{formatDate(m.created_at, "medium")}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={t(isLandlord ? "cases.maint.newLandlord" : "cases.maint.newTenant")}>
        {myLeases.length === 0 ? (
          <p className="fx-help">{t("cases.maint.noLease")}</p>
        ) : (
          <form className="case-form" onSubmit={submit}>
            <div className="mod-field">
              <label className="mod-label" htmlFor="mnt-lease">{t("cases.disputes.lease")}</label>
              <select id="mnt-lease" className="mod-select" value={form.contract_id} onChange={(e) => setForm({ ...form, contract_id: e.target.value })}>
                <option value="">{t("cases.disputes.pickLease")}</option>
                {myLeases.map((c) => (
                  <option key={c.contract_id} value={c.contract_id}>
                    #{digits(c.contract_id)} · {c.property_address} · {counterpartyOf(c, currentUser?.id)?.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mod-field">
              <label className="mod-label" htmlFor="mnt-title">{t("cases.maint.titleField")}</label>
              <input id="mnt-title" className="mod-input" maxLength={150} placeholder={t("cases.maint.titlePh")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="mod-field">
              <label className="mod-label" htmlFor="mnt-desc">{t("cases.maint.description")}</label>
              <textarea id="mnt-desc" className="mod-input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="mod-field">
              <label className="mod-label" htmlFor="mnt-priority">{t("cases.maint.priority")}</label>
              <select id="mnt-priority" className="mod-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{t(`cases.maint.priorityLevel.${p}`)}</option>)}
              </select>
            </div>
            {isLandlord && (
              <div className="mod-field">
                <label className="mod-label" htmlFor="mnt-date">{t("cases.maint.scheduled")}</label>
                <input id="mnt-date" type="date" className="mod-input" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
              </div>
            )}
            {error && <p className="mod-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t("cases.maint.sending") : t(isLandlord ? "cases.maint.submitNotice" : "cases.maint.submitRequest")}
            </button>
          </form>
        )}
      </Modal>
    </section>
  );
}