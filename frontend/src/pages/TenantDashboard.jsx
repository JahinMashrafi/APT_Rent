import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Home, Search, BedDouble, Ruler, Calendar, Banknote, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import AppNavbar from "../components/AppNavbar.jsx";
import MaintenancePanel from "../components/cases/MaintenancePanel.jsx";
import DisputesPanel from "../components/cases/DisputesPanel.jsx";
import api from "../services/api";
import { useApp } from "../context/AppContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import "../css/global.css";
import "../css/navbar.css";
import "../css/modules.css";

const PILL = { pending: "pill-muted", paid: "pill-done", due: "pill-open", overdue: "pill-danger" };
const ICON = { pending: Clock, paid: CheckCircle2, due: Clock, overdue: AlertTriangle };

export default function TenantDashboard() {
  const { t, formatCurrency, formatDate, formatNumber } = useLanguage();
  const { currentUser } = useApp();
  const [state, setState] = useState({ loading: true, data: null, pending: null });

  useEffect(() => {
    let cancelled = false;
    api.tenant.dashboard()
      .then((res) => { if (!cancelled) setState({ loading: false, data: res?.data ?? null, pending: res?.pending_lease ?? null }); })
      .catch(() => { if (!cancelled) setState({ loading: false, data: null, pending: null }); });
    return () => { cancelled = true; };
  }, []);

  const d = state.data;
  const month = (ym) => formatDate(`${ym}-01T00:00:00`, "monthYear");
  const day = (iso) => (iso ? formatDate(`${iso}T00:00:00`, "medium") : "—");
  const Status = d ? ICON[d.current_month.status] : Clock;

  return (
    <div className="module-shell">
      <AppNavbar />
      <main className="module-main module-main-wide">
        <span className="eyebrow" style={{ display: "block", marginBottom: 8 }}>{t("dash.eyebrow")}</span>
        <h1 className="module-title">{t("dash.welcome", { name: currentUser?.name ?? "" })}</h1>

        {state.loading ? <p className="fx-help">{t("common.loading")}</p> : !d ? (
          <div className="fx-empty mod-card" style={{ marginTop: "1.5rem" }}>
            <Home size={44} aria-hidden="true" />
            <h2>{t("dash.noProperty")}</h2>
            <p>{t("dash.noPropertyBody")}</p>
            {state.pending && (
              <p className="fx-help" style={{ marginTop: 8 }}>
                Your lease for {state.pending.address} is{" "}
                {state.pending.status === "fully_signed" ? "fully signed — waiting for your landlord to activate it." : "still being negotiated or signed."}{" "}
                <Link to="/contracts">View contract</Link>
              </p>
            )}
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 14 }}><Search size={15} /> {t("saved.browse")}</Link>
          </div>
        ) : (
          <>
            <section className="td-hero">
              <div className="td-hero-main">
                <span className="td-hero-label">{t("dash.myProperty")}</span>
                <h2><Link to={`/property/${d.property.property_id}`}>{d.property.address}</Link></h2>
                <p className="td-hero-meta">
                  <span><BedDouble size={15} /> {t("dash.bedsBaths", { beds: formatNumber(d.property.bedroom ?? 0), baths: formatNumber(d.property.bathroom ?? 0) })}</span>
                  {d.property.size_sqft ? <span><Ruler size={15} /> {formatNumber(d.property.size_sqft)} {t("compare.sqft")}</span> : null}
                  <span>{t("dash.landlord")}: {d.landlord}</span>
                </p>
                <div className="fx-actions">
                  <span className="pill pill-done">{t("contracts.status.active")}</span>
                  <Link to="/contracts" className="btn btn-ghost btn-sm td-hero-btn">{t("dash.viewLease")}</Link>
                </div>
              </div>
              <div className="td-hero-rent">
                <span className="td-hero-label">{t("dash.thisMonth")} · {month(d.current_month.month)}</span>
                <strong>{formatCurrency(d.lease.rate)}</strong>
                <span className={`pill ${PILL[d.current_month.status]}`}><Status size={13} /> {t(`dash.status.${d.current_month.status}`)}</span>
                <Link to="/rent" className="btn btn-primary btn-sm">{t("nav.payRent")}</Link>
              </div>
            </section>

            <div className="td-stats">
              <div className="td-stat">
                <Banknote size={20} />
                <span className="td-stat-label">{t("dash.rentDue")}</span>
                <strong className={d.total_due > 0 ? "is-bad" : "is-good"}>{formatCurrency(d.total_due)}</strong>
                <span className="fx-help">{d.months_due_count === 0 ? t("dash.allPaid") : t("dash.monthsDue", { count: d.months_due_count, n: formatNumber(d.months_due_count) })}</span>
              </div>
              <div className="td-stat">
                <Calendar size={20} />
                <span className="td-stat-label">{t("dash.leaseEnds")}</span>
                <strong>{day(d.lease.end_date)}</strong>
                {d.lease.start_date && <span className="fx-help">{t("dash.leaseTerm", { from: day(d.lease.start_date), to: day(d.lease.end_date) })}</span>}
              </div>
              <div className="td-stat">
                <Banknote size={20} />
                <span className="td-stat-label">{t("dash.deposit")}</span>
                <strong>{d.lease.deposit != null ? formatCurrency(d.lease.deposit) : "—"}</strong>
              </div>
            </div>

            {d.months_due.length > 0 && (
              <section className="mod-card mod-card-pad">
                <h3 style={{ fontSize: "1rem", marginBottom: 10 }}>{t("dash.rentDue")}</h3>
                <ul className="td-months">
                  {d.months_due.slice(-6).map((m) => (
                    <li key={m.month}><span>{month(m.month)}</span><strong>{formatCurrency(m.amount)}</strong></li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {/* Always shown: disputes and requests outlive an active lease. */}
        <MaintenancePanel role="tenant" />
        <DisputesPanel role="tenant" />
      </main>
      <footer className="site-footer"><div className="container"><p>{t("footer.brand")}</p></div></footer>
    </div>
  );
}