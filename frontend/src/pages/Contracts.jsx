/**
 * ============================================================================
 * Contracts.jsx — "the contract bar"
 * 
 * ============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronDown, ChevronUp, Clock, PenLine, Download } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import LeaseSummaryModal from "../components/lease/LeaseSummaryModal.jsx";
import api from "../services/api";
import { formatDateLong } from "../utils/tour.js";
import { formatDuration, monthsBetween } from "../utils/leaseDuration.js";
import { useApp } from "../context/AppContext.jsx";
import "../css/global.css";
import "../css/navbar.css";
import "../css/modules.css";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useAddressTranslations } from "../hooks/useAddressTranslations.js";

// One section per contract status, in display order.
const SECTIONS = [
  { key: "active", badge: "badge-success" },
  { key: "fully_signed", badge: "badge-ink" },
  { key: "landlord_signed", badge: "badge-warn" },
  { key: "tenant_signed", badge: "badge-warn" },
  { key: "lease_accepted", badge: "badge-warn" },
  { key: "tenant_proposal_sent", badge: "badge-warn" },
  { key: "terminated", badge: "badge-error" },
];

// Maps a contract onto exactly one of the sections above.
const sectionKeyOf = (contract) => {
  switch (contract.status) {
    case "active":
      return "active";
    case "fully_signed":
      return "fully_signed";
    case "signed_by_owner":
      return "landlord_signed";
    case "signed_by_tenant":
      return "tenant_signed";
    case "terminated":
      return "terminated";
    case "draft":
      return contract.negotiation_state === "TERMS_ACCEPTED" ? "lease_accepted" : "tenant_proposal_sent";
    default:
      return "other"; // e.g. legacy "completed" rows — shown in an extra section so nothing disappears
  }
};



export default function Contracts() {
  const { currentUser } = useApp();
  const { t, tx, lang, formatCurrency, digits } = useLanguage();
  const [contracts, setContracts] = useState([]);
  // Collect contract property addresses.
  const addressesToTranslate = useMemo(
    () =>
      contracts
        .map((contract) =>
          typeof contract.property_address === "string"
            ? contract.property_address.trim()
            : ""
        )
        .filter(Boolean),
    [contracts]
  );

  // Translate contract addresses in Bangla mode.
  const addressTranslations = useAddressTranslations(
    addressesToTranslate,
    lang === "bn"
  );
  const [loadError, setLoadError] = useState("");
  const [summaryEdit, setSummaryEdit] = useState(null); // contract whose lease summary the landlord is editing
  const [openId, setOpenId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // landlord pill filter: "all" or a section key
  const [details, setDetails] = useState({});
  const [negotiation, setNegotiation] = useState({});
  const [negotiationError, setNegotiationError] = useState({});
  const [acceptError, setAcceptError] = useState({});
  const [signatureBusy, setSignatureBusy] = useState({});
  const [signatureError, setSignatureError] = useState({});

  useEffect(() => {
    let cancelled = false;


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
          setLoadError(error.message || "__default__");
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

  // Landlord-only: confirm a fully signed lease is live, or terminate any open contract.
  const runAction = async (contract, action) => {
    if (action === "terminate" && !window.confirm(t("contracts.terminateConfirm"))) return;
    try {
      await api.contracts[action](contract.contract_id);
      const fresh = await api.contracts.list();
      setContracts(fresh?.data ?? []);
    } catch (error) {
      window.alert(error?.message || t("contracts.actionFailed"));
    }
  };

  const counterparty = (contract) => {
    const isMine = String(contract.owner?.user_id) === String(currentUser?.id);
    return isMine
      ? { label: t("contracts.tenant"), name: contract.tenant?.name ?? t("contracts.tenant") }
      : { label: t("contracts.landlord"), name: contract.owner?.name ?? t("contracts.landlord") };
  };

  const submitNegotiation = async (contract) => {
    const values = negotiation[contract.contract_id] ?? {};
    const rate = values.rate ?? details[contract.contract_id]?.rate ?? contract.rate;
    const deposit = values.deposit ?? details[contract.contract_id]?.deposit ?? contract.deposit;
    const numericRate = Number(rate);
    const numericDeposit = Number(deposit);

    if (!Number.isFinite(numericRate) || numericRate <= 0 || !Number.isFinite(numericDeposit) || numericDeposit < 0) {
      setNegotiationError((prev) => ({
        ...prev,
        [contract.contract_id]: "Enter a valid rent and non-negative deposit.",
      }));
      return;
    }

    try {
      setNegotiationError((prev) => ({ ...prev, [contract.contract_id]: "" }));
      const updated = await api.contracts.negotiate(contract.contract_id, {
        rate: values.rate ?? contract.rate,
        deposit: values.deposit ?? contract.deposit,
        message: values.message,
      });
      setContracts((prev) => prev.map((item) =>
        item.contract_id === contract.contract_id ? { ...item, ...updated } : item,
      ));
      setDetails((prev) => ({
        ...prev,
        [contract.contract_id]: { ...prev[contract.contract_id], ...updated },
      }));
    } catch (error) {
      setNegotiationError((prev) => ({
        ...prev,
        [contract.contract_id]: error.response?.data?.message || error.message || t("contracts.submitFailed"),
      }));
    }
  };

  const acceptContract = async (contract) => {
    try {
      setAcceptError((prev) => ({ ...prev, [contract.contract_id]: "" }));
      const updated = await api.contracts.accept(contract.contract_id);
      setContracts((prev) => prev.map((item) =>
        item.contract_id === contract.contract_id ? { ...item, ...updated } : item,
      ));
      setDetails((prev) => ({
        ...prev,
        [contract.contract_id]: { ...prev[contract.contract_id], ...updated },
      }));
    } catch (error) {
      setAcceptError((prev) => ({
        ...prev,
        [contract.contract_id]: error.response?.data?.message || error.message || t("contracts.acceptFailed"),
      }));
    }
  };

  const uploadSignature = (contract) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          setSignatureBusy((prev) => ({ ...prev, [contract.contract_id]: true }));
          setSignatureError((prev) => ({ ...prev, [contract.contract_id]: "" }));
          const updated = await api.contracts.sign(contract.contract_id, reader.result);
          setDetails((prev) => ({ ...prev, [contract.contract_id]: { ...prev[contract.contract_id], ...updated } }));
          setContracts((prev) => prev.map((item) => item.contract_id === contract.contract_id ? { ...item, ...updated } : item));
        } catch (error) {
          setSignatureError((prev) => ({ ...prev, [contract.contract_id]: error.message || t("contracts.signatureFailed") }));
        } finally {
          setSignatureBusy((prev) => ({ ...prev, [contract.contract_id]: false }));
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const sectionLabel = (key, contract) => {
    if (key === "other") return tx("contracts.status", contract.status);
    return t(`contracts.sections.${key}`);
  };

  // Status sections are a landlord-only view. Contracts where the viewer is the
  // tenant are shown as a plain list with no status sections.
  const landlordContracts = useMemo(
    () => contracts.filter((c) => String(c.owner?.user_id) === String(currentUser?.id)),
    [contracts, currentUser?.id],
  );
  const tenantContracts = useMemo(
    () => contracts.filter((c) => String(c.owner?.user_id) !== String(currentUser?.id)),
    [contracts, currentUser?.id],
  );

  const sectionList = useMemo(() => {
    const groups = SECTIONS.map((section) => ({
      ...section,
      label: t(`contracts.sections.${section.key}`),
      items: landlordContracts.filter((c) => sectionKeyOf(c) === section.key),
    }));
    const others = landlordContracts.filter((c) => sectionKeyOf(c) === "other");
    if (others.length) {
      groups.push({ key: "other", badge: "badge-neutral", label: t("contracts.sections.other"), items: others });
    }
    return groups;
  }, [landlordContracts, t]);

  const renderContract = (contract) => {
              const isOpen = openId === contract.contract_id;
              const originalAddress =
                typeof contract.property_address === "string"
                  ? contract.property_address.trim()
                  : "";

              const displayAddress =
                lang === "bn"
                  ? addressTranslations[originalAddress] || originalAddress
                  : originalAddress;
              const detail = details[contract.contract_id];
              const other = counterparty(contract);
              const isOwner = String(contract.owner?.user_id) === String(currentUser?.id);
              const otherUserId = isOwner ? contract.tenant?.user_id : contract.owner?.user_id;

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
                        style={{ fontWeight: 600, color: "var(--color-text-strong)", fontFamily: "var(--font-display)" }}
                      >
                        {displayAddress}
                      </Link>
                      <p style={{ fontSize: "0.82rem", color: "var(--color-blueprint)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={13} /> {t("contracts.contractNo", { id: digits(contract.contract_id) })} · {other.label}: {other.name}
                      </p>
                    </div>

                    <span className={`badge ${SECTIONS.find((x) => x.key === sectionKeyOf(contract))?.badge ?? "badge-neutral"}`}>
                      {sectionLabel(sectionKeyOf(contract), contract)}
                    </span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {/* Review entry point: ACTIVE contracts only, links to the other party's profile */}
                  {contract.status === "active" && otherUserId ? (
                    <div className="fx-actions" style={{ marginTop: 12 }}>
                      <Link className="btn btn-primary btn-sm" to={`/users/${otherUserId}#reviews`}>
                        {t("contracts.reviewUser", { name: other.name })}
                      </Link>
                    </div>
                  ) : null}
                  {/* Landlord actions: make a fully signed lease active, or terminate any open contract */}
                  {isOwner && !["terminated", "completed"].includes(contract.status) && (
                    <div className="fx-actions" style={{ marginTop: 12 }}>
                      {contract.status === "fully_signed" && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => runAction(contract, "activate")}>
                          {t("contracts.makeActive")}
                        </button>
                      )}
                      {contract.status === "draft" && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSummaryEdit(contract)}>
                          Edit lease summary
                        </button>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => runAction(contract, "terminate")}>
                        {t("contracts.terminate")}
                      </button>
                    </div>
                  )}

                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--color-line)", marginTop: "1rem", paddingTop: "1rem" }}>
                      {detail === undefined ? (
                        <p style={{ color: "var(--color-charcoal)", fontSize: "0.9rem" }}>{t("contracts.loadingContract")}</p>
                      ) : detail === null ? (
                        <p style={{ color: "var(--color-error)", fontSize: "0.9rem" }}>
                          {t("contracts.loadDetailFailed")}
                        </p>
                      ) : (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                            {[
                              { label: t("contracts.monthlyRent"), value: formatCurrency(contract.rate ?? 0) },
                              { label: t("contracts.securityDeposit"), value: formatCurrency(contract.deposit ?? 0) },
                              { label: t("contracts.startDate"), value: formatDateLong(contract.start_date, lang) },
                              { label: t("contracts.endDate"), value: formatDateLong(contract.end_date, lang) },
                              { label: "Lease duration", value: formatDuration(monthsBetween(contract.start_date, contract.end_date)) },
                            ].map((item) => (
                              <div key={item.label}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-blueprint)", display: "block" }}>{item.label}</span>
                                <span style={{ color: "var(--color-charcoal)", fontWeight: 600, fontSize: "0.9rem" }}>{item.value}</span>
                              </div>
                            ))}
                          </div>

                          {contract.status === "draft" && detail.negotiation_state !== "TERMS_ACCEPTED" && (
                            <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: "1rem", marginBottom: "1rem" }}>
                              <strong style={{ display: "block", marginBottom: "0.75rem", color: "var(--color-text-strong)" }}>
                                {t("contracts.bargainTitle")}
                              </strong>
                              {detail.awaiting_other_party && (
                                <p style={{ color: "var(--color-blueprint)" }}>
                                  {t("contracts.proposalSentNote")} {t("contracts.awaitingResponse")}
                                </p>
                              )}
                              {detail.can_accept && (
                                <button type="button" className="btn btn-primary" onClick={() => acceptContract(contract)} style={{ marginBottom: "0.75rem" }}>
                                  {isOwner ? t("contracts.acceptTenantProposal") : t("contracts.acceptTerms")}
                                </button>
                              )}
                              {acceptError[contract.contract_id] && <p role="alert" style={{ color: "var(--color-error)", marginBottom: "0.75rem" }}>{acceptError[contract.contract_id]}</p>}
                              {detail.can_counter && (
                                <form onSubmit={(event) => { event.preventDefault(); submitNegotiation(contract); }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                                    <label>
                                      <span className="eyebrow">{t("contracts.monthlyRentLabel")}</span>
                                      <input type="number" min="1" value={negotiation[contract.contract_id]?.rate ?? contract.rate ?? ""} onChange={(e) => setNegotiation((prev) => ({ ...prev, [contract.contract_id]: { ...prev[contract.contract_id], rate: e.target.value } }))} />
                                    </label>
                                    <label>
                                      <span className="eyebrow">{t("contracts.securityDepositLabel")}</span>
                                      <input type="number" min="0" value={negotiation[contract.contract_id]?.deposit ?? contract.deposit ?? ""} onChange={(e) => setNegotiation((prev) => ({ ...prev, [contract.contract_id]: { ...prev[contract.contract_id], deposit: e.target.value } }))} />
                                    </label>
                                  </div>
                                  <textarea placeholder={isOwner ? t("contracts.messageToTenant") : t("contracts.messageToLandlord")} value={negotiation[contract.contract_id]?.message ?? ""} onChange={(e) => setNegotiation((prev) => ({ ...prev, [contract.contract_id]: { ...prev[contract.contract_id], message: e.target.value } }))} style={{ width: "100%", marginTop: "0.75rem", minHeight: "70px" }} />
                                  <button type="submit" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>
                                    {isOwner ? t("contracts.sendCounter") : t("contracts.sendProposal")}
                                  </button>
                                  {negotiationError[contract.contract_id] && <p role="alert" style={{ color: "var(--color-error)", marginTop: "0.5rem" }}>{negotiationError[contract.contract_id]}</p>}
                                </form>
                              )}
                            </div>
                          )}

                          {detail.can_sign && (
                            <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: "1rem", marginBottom: "1rem" }}>
                              <strong style={{ display: "block", marginBottom: "0.5rem", color: "var(--color-text-strong)" }}>{t("contracts.signTitle")}</strong>
                              <p style={{ color: "var(--color-charcoal)", fontSize: "0.85rem" }}>{t("contracts.signHelp")}</p>
                              <button type="button" className="btn btn-primary" disabled={signatureBusy[contract.contract_id]} onClick={() => uploadSignature(contract)}>
                                {signatureBusy[contract.contract_id] ? t("contracts.uploading") : t("contracts.uploadSignature")}
                              </button>
                              {signatureError[contract.contract_id] && <p role="alert" style={{ color: "var(--color-error)" }}>{signatureError[contract.contract_id]}</p>}
                            </div>
                          )}

                          {detail.negotiation_state === "TERMS_ACCEPTED" && contract.status === "draft" && (
                            <p style={{ color: "var(--color-success)", marginTop: "0.5rem" }}>{t("contracts.acceptedNote")}</p>
                          )}

                          {detail.terms_and_conditions && (
                            <div style={{ marginBottom: "1rem" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-blueprint)", display: "block", marginBottom: "4px" }}>{t("contracts.terms")}</span>
                              <p style={{ color: "var(--color-charcoal)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>{detail.terms_and_conditions}</p>
                            </div>
                          )}

                          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                            {[
                              { label: t("contracts.landlordSignature"), url: detail.owner_signature_url },
                              { label: t("contracts.tenantSignature"), url: detail.tenant_signature_url },
                            ].map((sig) => (
                              <div key={sig.label}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-blueprint)", display: "block", marginBottom: "4px" }}>{sig.label}</span>
                                {sig.url ? (
                                  <img src={sig.url} alt={sig.label} style={{ maxHeight: "56px", border: "1px solid var(--color-line)", borderRadius: "var(--radius-sm)", background: "#fff" }} />
                                ) : (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--color-charcoal)", fontSize: "0.85rem" }}>
                                    <PenLine size={13} /> {t("contracts.notSigned")}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {!(contract.status === "active" && !detail.contract_pdf_url) && (
                          <div>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--color-blueprint)", display: "block", marginBottom: "8px" }}>
                              {t("contracts.leaseDocument")}
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
                                  <iframe
                                    src={detail.contract_pdf_url}
                                    title={t("contracts.pdfTitle", { id: digits(contract.contract_id) })}
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
                                  <Download size={16} /> {t("contracts.downloadPdf")}
                                </a>
                              </>
                            ) : (
                              <p style={{ color: "var(--color-charcoal)", fontSize: "0.85rem" }}>
                                {t("contracts.pdfPending")}
                              </p>
                            )}
                          </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
  };

  return (
    <div className="module-shell">
      <AppNavbar />

      <main className="module-main">
        <div style={{ marginBottom: "2rem" }}>
          <span className="eyebrow">{t("contracts.eyebrow")}</span>
          <h1 className="module-title">{t("contracts.title")}</h1>
          <p className="module-subtitle">{t("contracts.subtitle")}</p>
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
            {loadError === "__default__" ? t("contracts.loadError") : loadError}
          </p>
        )}

        {contracts.length === 0 ? (
          <div className="mod-card mod-card-pad" style={{ textAlign: "center", color: "var(--color-charcoal)" }}>
            <FileText size={28} style={{ color: "var(--color-line-strong)", margin: "0 auto 12px" }} />
            <p>{t("contracts.empty")}</p>
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
              {t("common.browseListings")}
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {tenantContracts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {tenantContracts.map(renderContract)}
              </div>
            )}
            {landlordContracts.length > 0 && (
              <div className="pill-tabs" style={{ alignSelf: "flex-start", maxWidth: "100%", overflowX: "auto" }}>
                <button
                  className={`pill-tab ${statusFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setStatusFilter("all")}
                >
                  {t("contracts.filterAll")}
                </button>
                {sectionList.map((section) => (
                  <button
                    key={section.key}
                    className={`pill-tab ${statusFilter === section.key ? "is-active" : ""}`}
                    onClick={() => setStatusFilter(section.key)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )}
            {landlordContracts.length > 0 && sectionList
              .filter((section) => statusFilter === "all" || section.key === statusFilter)
              .map((section) => (
              <section key={section.key}>
                <h2
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "1.05rem",
                    fontFamily: "var(--font-display)",
                    color: "var(--color-text-strong)",
                    marginBottom: "12px",
                  }}
                >
                  {section.label}
                  <span className={`badge ${section.badge}`}>{digits(section.items.length)}</span>
                </h2>
                {section.items.length === 0 ? (
                  <p style={{ color: "var(--color-charcoal)", fontSize: "0.85rem", margin: 0 }}>
                    {t("contracts.sectionEmpty")}
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {section.items.map(renderContract)}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      {summaryEdit && (
        <LeaseSummaryModal
          contractId={summaryEdit.contract_id}
          onClose={() => setSummaryEdit(null)}
          onSaved={() => {
            setDetails({});
            api.contracts.list().then((fresh) => setContracts(fresh?.data ?? [])).catch(() => {});
          }}
        />
      )}

      <footer className="site-footer">
        <div className="container">
          <p>{t("footer.brand")}</p>
        </div>
      </footer>
    </div>
  );
}