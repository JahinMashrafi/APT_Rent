import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Scale } from "lucide-react";
import Modal from "../ui/Modal.jsx";
import { useToast } from "../ui/Toast.jsx";
import api from "../../services/api";
import { useApp } from "../../context/AppContext.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { DISPUTE_PILL, contractsForRole, counterpartyOf } from "./caseUtils.js";

/**
 * Disputes section for the tenant and landlord dashboards. One list: the
 * disputes the user filed AND the ones filed against them, each tagged so
 * the two are never confused. Rows open the exact dispute at /disputes/:id.
 * Resolving is admin-only and lives on that page.
 */
export default function DisputesPanel({ role }) {
  const { t, digits, formatDate } = useLanguage();
  const { currentUser } = useApp();
  const { showToast } = useToast();
  const [items, setItems] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contract_id: "", reason: "", details: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.disputes.list().then((res) => setItems(res?.data ?? [])).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
    api.contracts.list().then((res) => setContracts(res?.data ?? [])).catch(() => setContracts([]));
  }, [load]);

  const myLeases = useMemo(() => contractsForRole(contracts, currentUser?.id, role, ["active"]), [contracts, currentUser?.id, role]);
  const shown = (items ?? []).filter((d) => filter === "all" || (filter === "mine" ? d.created_by_me : d.against_me));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.contract_id || !form.reason.trim() || !form.details.trim()) {
      setError(t("cases.disputes.failed"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.disputes.create({ contract_id: Number(form.contract_id), reason: form.reason.trim(), details: form.details.trim() });
      showToast({ message: t("cases.disputes.filed"), type: "success" });
      setOpen(false);
      setForm({ contract_id: "", reason: "", details: "" });
      load();
    } catch (err) {
      setError(err?.message || t("cases.disputes.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="case-section" id="disputes">
      <div className="case-section-head">
        <div>
          <h2>{t("cases.disputes.title")}</h2>
          <p className="fx-help">{t("cases.disputes.intro")}</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { setError(""); setOpen(true); }}>
          <Plus size={14} /> {t("cases.disputes.new")}
        </button>
      </div>

      <div className="case-filters">
        {["all", "mine", "against"].map((key) => (
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
            <Scale size={32} aria-hidden="true" />
            <p>{items.length === 0 ? t("cases.disputes.empty") : t("cases.emptyFiltered")}</p>
          </div>
        ) : (
          <ul className="case-list">
            {shown.map((d) => {
              const other = d.created_by_me ? d.reported_user : d.complainant;
              return (
                <li key={d.dispute_id} className="case-item">
                  <Link to={`/disputes/${d.dispute_id}`} className="case-link">
                    <div className="case-head">
                      <strong>#{digits(d.dispute_id)} · {d.reason}</strong>
                      <span className="case-pills">
                        <span className={`pill ${d.created_by_me ? "pill-progress" : "pill-danger"}`}>
                          {d.created_by_me ? t("cases.byYou") : t("cases.againstYou")}
                        </span>
                        <span className={`pill ${DISPUTE_PILL[d.status] ?? ""}`}>{t(`cases.status.${d.status}`)}</span>
                      </span>
                    </div>
                    <p className="case-sub">
                      {d.created_by_me ? t("cases.disputes.against") : t("cases.disputes.filedBy")}: {other?.name}
                      {d.property_address ? ` · ${d.property_address}` : ""}
                    </p>
                    <p className="case-meta">{formatDate(d.created_at, "medium")}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("cases.disputes.new")}>
        {myLeases.length === 0 ? (
          <p className="fx-help">{t("cases.disputes.noLease")}</p>
        ) : (
          <form className="case-form" onSubmit={submit}>
            <div className="mod-field">
              <label className="mod-label" htmlFor="dsp-lease">{t("cases.disputes.lease")}</label>
              <select id="dsp-lease" className="mod-select" value={form.contract_id} onChange={(e) => setForm({ ...form, contract_id: e.target.value })}>
                <option value="">{t("cases.disputes.pickLease")}</option>
                {myLeases.map((c) => (
                  <option key={c.contract_id} value={c.contract_id}>
                    #{digits(c.contract_id)} · {c.property_address} · {counterpartyOf(c, currentUser?.id)?.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mod-field">
              <label className="mod-label" htmlFor="dsp-reason">{t("cases.disputes.reason")}</label>
              <input id="dsp-reason" className="mod-input" maxLength={255} placeholder={t("cases.disputes.reasonPh")} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="mod-field">
              <label className="mod-label" htmlFor="dsp-details">{t("cases.disputes.details")}</label>
              <textarea id="dsp-details" className="mod-input" rows={5} placeholder={t("cases.disputes.detailsPh")} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
            </div>
            {error && <p className="mod-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t("cases.disputes.filing") : t("cases.disputes.submit")}
            </button>
          </form>
        )}
      </Modal>
    </section>
  );
}