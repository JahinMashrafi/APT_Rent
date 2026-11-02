import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import Modal from "../ui/Modal.jsx";
import api from "../../services/api";
import { useToast } from "../ui/Toast.jsx";
import { addMonths, monthsBetween, formatDuration } from "../../utils/leaseDuration.js";

const money = (n) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

// Opens the browser's calendar as soon as the field is clicked (not only the tiny icon).
const openPicker = (e) => { try { e.currentTarget.showPicker?.(); } catch { /* not allowed in this context */ } };

/**
 * Lease Summary editor (landlord).
 *  - new offer:  <LeaseSummaryModal propertyId tenantId />  values come from the database; sending creates the lease
 *  - existing:   <LeaseSummaryModal contractId />           edits the saved summary while the lease is still a draft
 * Tenant name and email come from the tenant's account and are shown read-only.
 */
export default function LeaseSummaryModal({ propertyId, tenantId, contractId, onClose, onSaved }) {
  const { showToast } = useToast();
  const [load, setLoad] = useState({ status: "loading", message: "" });
  const [meta, setMeta] = useState({ contractId: contractId ?? null, address: "", canEdit: true, note: "" });
  const [form, setForm] = useState(null);
  const [unit, setUnit] = useState("months"); // how the duration box is displayed: "months" | "years"
  const [termsDirty, setTermsDirty] = useState(false);
  const [step, setStep] = useState("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    const apply = (s, id, note = "") => {
      if (off) return;
      const months = s.duration_months ?? monthsBetween(s.start_date, s.end_date);
      setMeta({ contractId: id, address: s.property_address, canEdit: s.can_edit !== false, note });
      setForm({
        tenant_name: s.tenant_name ?? "", tenant_email: s.tenant_email ?? "",
        rate: String(s.rate ?? ""), deposit: String(s.deposit ?? 0),
        start_date: s.start_date, end_date: s.end_date, months,
        terms: s.terms_and_conditions ?? "",
      });
      setUnit(months >= 12 && months % 12 === 0 ? "years" : "months");
      // Saved wording is never auto-replaced here; the server keeps untouched defaults in step when saving.
      setTermsDirty(Boolean(id));
      setLoad({ status: "ready", message: "" });
    };
    (async () => {
      try {
        if (contractId) {
          const r = await api.leaseSummary.get(contractId);
          apply(r.data, contractId);
        } else {
          const r = await api.leaseSummary.preview(propertyId, tenantId);
          if (r.data.existing) {
            const s = await api.leaseSummary.get(r.data.existing.contract_id);
            apply(s.data, r.data.existing.contract_id, `A lease offer already exists for this tenant (status: ${r.data.existing.status}). You are editing that one.`);
          } else {
            apply({ ...r.data.summary, can_edit: true }, null);
          }
        }
      } catch (e) {
        if (!off) setLoad({ status: "error", message: e?.message || "Could not load the lease summary." });
      }
    })();
    return () => { off = true; };
  }, [propertyId, tenantId, contractId]);

  // Until the landlord edits the wording, keep the default terms in step with the dates and deposit.
  const start = form?.start_date;
  const end = form?.end_date;
  const deposit = form?.deposit;
  const ready = form !== null;
  useEffect(() => {
    if (!ready || termsDirty) return undefined;
    let off = false;
    const timer = setTimeout(() => {
      api.leaseSummary.defaultTerms({ start_date: start, end_date: end, deposit })
        .then((r) => { if (!off) setForm((f) => (f ? { ...f, terms: r.terms_and_conditions } : f)); })
        .catch(() => {});
    }, 300);
    return () => { off = true; clearTimeout(timer); };
  }, [ready, start, end, deposit, termsDirty]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Start / duration / end stay consistent: changing one moves the right other one.
  const setStart = (e) => setForm((f) => ({ ...f, start_date: e.target.value, end_date: e.target.value && f.months > 0 ? addMonths(e.target.value, f.months) : f.end_date }));
  const setEnd = (e) => setForm((f) => ({ ...f, end_date: e.target.value, months: f.start_date && e.target.value ? monthsBetween(f.start_date, e.target.value) : f.months }));
  const setDurationValue = (e) => {
    const typed = Number(e.target.value);
    const months = unit === "years" ? Math.round(typed * 12) : Math.round(typed);
    setForm((f) => ({ ...f, months: Number.isFinite(months) && months > 0 ? months : 0, end_date: months > 0 && f.start_date ? addMonths(f.start_date, months) : f.end_date }));
  };
  const durationBoxValue = !form || !form.months ? "" : unit === "years" ? String(Number((form.months / 12).toFixed(2))) : String(form.months);

  const validate = () => {
    if (!(Number(form.rate) > 0)) return "Monthly rent must be greater than 0.";
    if (!(Number(form.deposit) >= 0)) return "Security deposit cannot be negative.";
    if (!form.start_date || !form.end_date || form.end_date <= form.start_date) return "The end date must be after the start date.";
    if (!form.terms.trim()) return "Terms and conditions cannot be empty.";
    return "";
  };
  const goReview = () => { const problem = validate(); setError(problem); if (!problem) setStep("review"); };

  const submit = async () => {
    setBusy(true);
    setError("");
    const common = { rate: Number(form.rate), deposit: Number(form.deposit), start_date: form.start_date, end_date: form.end_date };
    try {
      if (meta.contractId) {
        await api.leaseSummary.update(meta.contractId, { ...common, terms_and_conditions: form.terms });
        showToast({ message: "Lease summary saved. The tenant has been notified.", type: "success" });
      } else {
        await api.contracts.create({ property_id: propertyId, tenant_id: tenantId, ...common, terms_and_conditions: termsDirty ? form.terms : undefined });
        showToast({ message: "Lease offer sent to the tenant.", type: "success" });
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e?.message || "Could not save the lease summary.");
      setStep("edit");
    } finally {
      setBusy(false);
    }
  };

  const dateField = (label, value, onChange, extra = {}) => (
    <label>
      <span className="mod-label"><CalendarDays size={12} style={{ verticalAlign: "-1px" }} /> {label}</span>
      <input className="mod-input" type="date" value={value} onChange={onChange} onClick={openPicker} disabled={!meta.canEdit} style={{ cursor: "pointer" }} {...extra} />
    </label>
  );

  return (
    <Modal isOpen onClose={onClose} title={meta.contractId ? "Lease Summary" : "Offer Lease"} size="lg">
      {load.status === "loading" && <p>Loading lease summary…</p>}
      {load.status === "error" && <p role="alert" style={{ color: "var(--color-error)" }}>{load.message}</p>}
      {load.status === "ready" && form && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p className="fx-help" style={{ margin: 0 }}>{meta.address}</p>
          {meta.note && <p className="fx-help" style={{ margin: 0 }}>{meta.note}</p>}
          {!meta.canEdit && <p role="alert" style={{ color: "var(--color-error)", margin: 0 }}>This lease is past the draft stage, so the summary can no longer be edited.</p>}

          {step === "edit" ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                <label><span className="mod-label">Tenant name</span><input className="mod-input" value={form.tenant_name} readOnly disabled /></label>
                <label><span className="mod-label">Tenant email</span><input className="mod-input" value={form.tenant_email} readOnly disabled /></label>
                <label><span className="mod-label">Monthly rent (৳)</span><input className="mod-input" type="number" min="1" value={form.rate} onChange={set("rate")} disabled={!meta.canEdit} /></label>
                <label><span className="mod-label">Security deposit (৳)</span><input className="mod-input" type="number" min="0" value={form.deposit} onChange={set("deposit")} disabled={!meta.canEdit} /></label>
                {dateField("Lease start date", form.start_date, setStart)}
                <label>
                  <span className="mod-label">Lease duration</span>
                  <span style={{ display: "flex", gap: 6 }}>
                    <input className="mod-input" type="number" min={unit === "years" ? "0.5" : "1"} step={unit === "years" ? "0.5" : "1"} max={unit === "years" ? "10" : "120"}
                      value={durationBoxValue} onChange={setDurationValue} disabled={!meta.canEdit} style={{ flex: 1, minWidth: 0 }} />
                    <select className="mod-input" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={!meta.canEdit} style={{ width: 110 }} aria-label="Duration unit">
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </span>
                  <span className="fx-help">= {formatDuration(form.months)}</span>
                </label>
                {dateField("Lease end date", form.end_date, setEnd, { min: form.start_date })}
              </div>
              <label>
                <span className="mod-label">Terms and conditions</span>
                <textarea
                  className="mod-input" rows={11} style={{ width: "100%", fontFamily: "inherit" }} value={form.terms}
                  onChange={(e) => { setTermsDirty(true); setForm((f) => ({ ...f, terms: e.target.value })); }}
                  disabled={!meta.canEdit}
                />
                <span className="fx-help">{termsDirty ? "Your wording is kept exactly as written." : "Starting text. The dates and deposit in it update automatically until you edit it."}</span>
              </label>
              {error && <p role="alert" style={{ color: "var(--color-error)", margin: 0 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={goReview} disabled={!meta.canEdit}>Review lease summary</button>
              </div>
            </>
          ) : (
            <>
              <div className="mod-card mod-card-pad" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                {[["Tenant", form.tenant_name], ["Email", form.tenant_email], ["Monthly rent", money(form.rate)], ["Security deposit", money(form.deposit)],
                  ["Start date", form.start_date], ["End date", form.end_date], ["Duration", formatDuration(form.months)]].map(([k, v]) => (
                  <div key={k}><span className="mod-label">{k}</span><div style={{ fontWeight: 600, color: "var(--color-text-strong)" }}>{v}</div></div>
                ))}
              </div>
              <div>
                <span className="mod-label">Terms and conditions</span>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "4px 0 0", color: "var(--color-charcoal)", fontSize: "0.9rem", lineHeight: 1.6 }}>{form.terms}</pre>
              </div>
              {error && <p role="alert" style={{ color: "var(--color-error)", margin: 0 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setStep("edit")} disabled={busy}>Back to editing</button>
                <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : meta.contractId ? "Save lease summary" : "Send lease offer"}</button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}