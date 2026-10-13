/**
 * ============================================================================
 * Contracts.jsx — "the contract bar"
 * ============================================================================
 * CHANGED from your version:
 *   1. Each row in the list now also shows a transaction id and a Yes/No
 *      payment-status badge — both come straight from listContracts()'s new
 *      transaction_id / payment_status fields (contractController.js).
 *   2. The expanded "View details" panel now has a Lease Document section:
 *      an embedded PDF preview (<iframe>) plus a Download button, pointed
 *      at contract.contract_pdf_url.
 * Everything else (the fetch-on-open accordion pattern, signature display,
 * loading/error states) is exactly what you already had.
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronDown, ChevronUp, Clock, PenLine, Download, Receipt } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import api from "../services/api";
import { formatDateLong } from "../utils/tour.js";
import { useApp } from "../context/AppContext.jsx";
import "../css/global.css";
import "../css/navbar.css";
import "../css/modules.css";

const STATUS_BADGE = {
  draft: "badge-warn",
  signed_by_owner: "badge-warn",
  signed_by_tenant: "badge-warn",
  fully_signed: "badge-ink",
  active: "badge-success",
};

const STATUS_LABEL = {
  draft: "Awaiting signatures",
  signed_by_owner: "Signed by landlord",
  signed_by_tenant: "Signed by tenant",
  fully_signed: "Fully signed",
  active: "Active lease",
};

export default function Contracts() {
  const { currentUser } = useApp();
  const [contracts, setContracts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});

  useEffect(() => {
    let cancelled = false;

    // GET /contracts — both parties of a lease land here: the query
    // matches on owner_id OR tenant_id, so one page serves either side.
    // Each row now also carries transaction_id / payment_status / contract_pdf_url.
    api.contracts
      .list()
      .then((data) => {
        if (cancelled) return;
        setContracts(data?.data ?? []);
        setLoadError("");
      })
      .catch((error) => {
        if (!cancelled) {
          setContracts([]);
          setLoadError(error.message || "Could not load contracts.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (contractId) => {
    if (openId === contractId) {
      setOpenId(null);
      return;
    }
    setOpenId(contractId);
    if (!details[contractId]) {
      api.contracts
        .getById(contractId)
        .then((contract) => setDetails((prev) => ({ ...prev, [contractId]: contract })))
        .catch(() => setDetails((prev) => ({ ...prev, [contractId]: null })));
    }
  };

  const counterparty = (contract) => {
    const isMine = String(contract.owner?.user_id) === String(currentUser?.id);
    return isMine
      ? { label: "Tenant", name: contract.tenant?.name ?? "Tenant" }
      : { label: "Landlord", name: contract.owner?.name ?? "Landlord" };
  };

  return (
    <div className="module-shell">
      <AppNavbar />

      <main className="module-main">
        <div style={{ marginBottom: "2rem" }}>
          <span className="eyebrow">Lease Documents</span>
          <h1 className="module-title">My Contracts</h1>
          <p className="module-subtitle">Every lease agreement you're part of — review terms, payment status, and signatures anytime.</p>
        </div>

        {loadError && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
              color: "var(--color-blueprint)",
              background: "var(--color-paper-dim)",
              border: "1px dashed var(--color-line-strong)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              marginBottom: "1.5rem",
            }}
          >
            {loadError}
          </p>
        )}

        {contracts.length === 0 ? (
          <div className="mod-card mod-card-pad" style={{ textAlign: "center", color: "var(--color-charcoal)" }}>
            <FileText size={28} style={{ color: "var(--color-line-strong)", margin: "0 auto 12px" }} />
            <p>No lease contracts yet.</p>
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
              Browse listings
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {contracts.map((contract) => {
              const isOpen = openId === contract.contract_id;
              const detail = details[contract.contract_id];
              const other = counterparty(contract);
              // These two fields come straight off the list row — see
              // "transaction id / payment status yes-no" in the ask.
              const transactionId = contract.transaction_id;
              const isPaid = contract.payment_status === "yes";

              return (
                <div key={contract.contract_id} className="mod-card mod-card-pad">
                  <button
                    onClick={() => toggle(contract.contract_id)}
                    style={{ width: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                  >
                    <div style={{ flex: "1 1 220px" }}>
                      <Link
                        to={`/property/${contract.property_id}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontWeight: 600, color: "var(--color-ink)", fontFamily: "var(--font-display)" }}
                      >
                        {contract.property_address}
                      </Link>
                      <p style={{ fontSize: "0.82rem", color: "var(--color-blueprint)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={13} /> Contract #{contract.contract_id} · {other.label}: {other.name}
                      </p>
                    </div>

                    {/* --- NEW: transaction id + Yes/No payment badge --- */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.72rem",
                          color: "var(--color-blueprint)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Receipt size={12} /> {transactionId ? `Txn: ${transactionId}` : "No transaction yet"}
                      </span>
                      <span className={`badge ${isPaid ? "badge-success" : "badge-warn"}`}>
                        Payment: {isPaid ? "Yes" : "No"}
                      </span>
                    </div>

                    <span className={`badge ${STATUS_BADGE[contract.status] ?? "badge-neutral"}`}>
                      {STATUS_LABEL[contract.status] ?? contract.status}
                    </span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--color-line)", marginTop: "1rem", paddingTop: "1rem" }}>
                      {detail === undefined ? (
                        <p style={{ color: "var(--color-charcoal)", fontSize: "0.9rem" }}>Loading contract…</p>
                      ) : detail === null ? (
                        <p style={{ color: "var(--color-error)", fontSize: "0.9rem" }}>
                          Couldn't load the full contract. Try again in a moment.
                        </p>
                      ) : (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                            {[
                              { label: "Monthly Rent", value: `৳${Number(contract.rate ?? 0).toLocaleString("en-BD")}` },
                              { label: "Start Date", value: formatDateLong(contract.start_date) },
                              { label: "End Date", value: formatDateLong(contract.end_date) },
                            ].map((item) => (
                              <div key={item.label}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-blueprint)", display: "block" }}>{item.label}</span>
                                <span style={{ color: "var(--color-charcoal)", fontWeight: 600, fontSize: "0.9rem" }}>{item.value}</span>
                              </div>
                            ))}
                          </div>

                          {detail.terms_and_conditions && (
                            <div style={{ marginBottom: "1rem" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-blueprint)", display: "block", marginBottom: "4px" }}>Terms &amp; Conditions</span>
                              <p style={{ color: "var(--color-charcoal)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>{detail.terms_and_conditions}</p>
                            </div>
                          )}

                          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                            {[
                              { label: "Landlord signature", url: detail.owner_signature_url },
                              { label: "Tenant signature", url: detail.tenant_signature_url },
                            ].map((sig) => (
                              <div key={sig.label}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-blueprint)", display: "block", marginBottom: "4px" }}>{sig.label}</span>
                                {sig.url ? (
                                  <img src={sig.url} alt={sig.label} style={{ maxHeight: "56px", border: "1px solid var(--color-line)", borderRadius: "var(--radius-sm)", background: "#fff" }} />
                                ) : (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--color-charcoal)", fontSize: "0.85rem" }}>
                                    <PenLine size={13} /> Not signed yet
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* =================== NEW: Lease Document (PDF) =================== */}
                          <div>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-blueprint)", display: "block", marginBottom: "8px" }}>
                              Lease Document
                            </span>

                            {detail.contract_pdf_url ? (
                              <>
                                <div
                                  style={{
                                    border: "1px solid var(--color-line)",
                                    borderRadius: "var(--radius-sm)",
                                    overflow: "hidden",
                                    height: "420px",
                                    marginBottom: "10px",
                                  }}
                                >
                                  {/* Browser's built-in PDF viewer renders this inline. */}
                                  <iframe
                                    src={detail.contract_pdf_url}
                                    title={`Lease contract #${contract.contract_id}`}
                                    style={{ width: "100%", height: "100%", border: "none" }}
                                  />
                                </div>
                                <a
                                  href={detail.contract_pdf_url}
                                  download={`lease-contract-${contract.contract_id}.pdf`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-primary"
                                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                                >
                                  <Download size={16} /> Download PDF
                                </a>
                              </>
                            ) : (
                              <p style={{ color: "var(--color-charcoal)", fontSize: "0.85rem" }}>
                                The lease document is still being generated — check back in a moment, or ask your landlord to re-save the contract.
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>APT&nbsp;RENT // EST. 2026</p>
        </div>
      </footer>
    </div>
  );
}
