import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronDown, ChevronUp, Clock, PenLine } from "lucide-react";
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
  // Which contract's detail is expanded. The list row holds the summary;
  // terms and signature images live on GET /contracts/:id, fetched once
  // when a row is opened.
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});
  const [negotiation, setNegotiation] = useState({});
  const [negotiationError, setNegotiationError] = useState({});
  const [acceptError, setAcceptError] = useState({});

  useEffect(() => {
    let cancelled = false;

    // GET /contracts — both parties of a lease land here: the query
    // matches on owner_id OR tenant_id, so one page serves either side.
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

  const submitNegotiation = async (contract) => {
    const values = negotiation[contract.contract_id] ?? {};
    try {
      setNegotiationError((prev) => ({ ...prev, [contract.contract_id]: "" }));
      const updated = await api.contracts.negotiate(contract.contract_id, {
        rate: values.rate,
        deposit: values.deposit,
        message: values.message,
      });
      setContracts((prev) => prev.map((item) =>
        item.contract_id === contract.contract_id
          ? { ...item, rate: updated.rate, deposit: updated.deposit, negotiation_status: updated.negotiation_status }
          : item,
      ));
      setDetails((prev) => ({
        ...prev,
        [contract.contract_id]: { ...prev[contract.contract_id], ...updated },
      }));
    } catch (error) {
      setNegotiationError((prev) => ({
        ...prev,
        [contract.contract_id]: error.response?.data?.message || error.message || "Could not submit proposal.",
      }));
    }
  };

  const acceptContract = async (contract) => {
    try {
      setAcceptError((prev) => ({ ...prev, [contract.contract_id]: "" }));
      const updated = await api.contracts.accept(contract.contract_id);
      setContracts((prev) => prev.map((item) =>
        item.contract_id === contract.contract_id
          ? { ...item, negotiation_status: updated.negotiation_status }
          : item,
      ));
      setDetails((prev) => ({
        ...prev,
        [contract.contract_id]: { ...prev[contract.contract_id], ...updated },
      }));
    } catch (error) {
      setAcceptError((prev) => ({
        ...prev,
        [contract.contract_id]: error.response?.data?.message || error.message || "Could not accept lease.",
      }));
    }
  };

  return (
    <div className="module-shell">
      <AppNavbar />

      <main className="module-main">
        <div style={{ marginBottom: "2rem" }}>
          <span className="eyebrow">Lease Documents</span>
          <h1 className="module-title">My Contracts</h1>
          <p className="module-subtitle">Every lease agreement you're part of — review terms and signatures anytime.</p>
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

                    <span className={`badge ${STATUS_BADGE[contract.status] ?? "badge-neutral"}`}>
                      {contract.negotiation_status === "accepted"
                        ? "Lease accepted"
                        : contract.negotiation_status === "proposed"
                          ? "Tenant proposal sent"
                          : STATUS_LABEL[contract.status] ?? contract.status}
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
                              { label: "Security Deposit", value: `৳${Number(contract.deposit ?? 0).toLocaleString("en-BD")}` },
                              { label: "Start Date", value: formatDateLong(contract.start_date) },
                              { label: "End Date", value: formatDateLong(contract.end_date) },
                            ].map((item) => (
                              <div key={item.label}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-blueprint)", display: "block" }}>{item.label}</span>
                                <span style={{ color: "var(--color-charcoal)", fontWeight: 600, fontSize: "0.9rem" }}>{item.value}</span>
                              </div>
                            ))}
                          </div>

                          {String(contract.tenant?.user_id) === String(currentUser?.id) && contract.status === "draft" && (
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                submitNegotiation(contract);
                              }}
                              style={{ borderTop: "1px solid var(--color-line)", paddingTop: "1rem", marginBottom: "1rem" }}
                            >
                              <strong style={{ display: "block", marginBottom: "0.75rem", color: "var(--color-ink)" }}>
                                Bargain lease terms
                              </strong>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                                <label>
                                  <span className="eyebrow">Monthly rent</span>
                                  <input type="number" min="1" value={negotiation[contract.contract_id]?.rate ?? contract.rate ?? ""} onChange={(event) => setNegotiation((prev) => ({ ...prev, [contract.contract_id]: { ...prev[contract.contract_id], rate: event.target.value } }))} />
                                </label>
                                <label>
                                  <span className="eyebrow">Security deposit</span>
                                  <input type="number" min="0" value={negotiation[contract.contract_id]?.deposit ?? contract.deposit ?? ""} onChange={(event) => setNegotiation((prev) => ({ ...prev, [contract.contract_id]: { ...prev[contract.contract_id], deposit: event.target.value } }))} />
                                </label>
                              </div>
                              <textarea placeholder="Optional message to the landlord" value={negotiation[contract.contract_id]?.message ?? ""} onChange={(event) => setNegotiation((prev) => ({ ...prev, [contract.contract_id]: { ...prev[contract.contract_id], message: event.target.value } }))} style={{ width: "100%", marginTop: "0.75rem", minHeight: "70px" }} />
                              <button type="submit" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>Send bargaining proposal</button>
                              {negotiationError[contract.contract_id] && <p role="alert" style={{ color: "var(--color-error)", marginTop: "0.5rem" }}>{negotiationError[contract.contract_id]}</p>}
                              {detail.negotiation_status === "proposed" && <p style={{ color: "var(--color-blueprint)", marginTop: "0.5rem" }}>Your proposed terms were sent to the landlord.</p>}
                              {detail.negotiation_status !== "accepted" && (
                                <button type="button" className="btn btn-primary" onClick={() => acceptContract(contract)} style={{ marginTop: "0.75rem" }}>
                                  Accept these lease terms
                                </button>
                              )}
                              {detail.negotiation_status === "accepted" && <p style={{ color: "var(--color-success)", marginTop: "0.5rem" }}>Lease accepted. The landlord has been notified.</p>}
                              {acceptError[contract.contract_id] && <p role="alert" style={{ color: "var(--color-error)", marginTop: "0.5rem" }}>{acceptError[contract.contract_id]}</p>}
                            </form>
                          )}

                          {detail.terms_and_conditions && (
                            <div style={{ marginBottom: "1rem" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-blueprint)", display: "block", marginBottom: "4px" }}>Terms &amp; Conditions</span>
                              <p style={{ color: "var(--color-charcoal)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>{detail.terms_and_conditions}</p>
                            </div>
                          )}

                          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
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
