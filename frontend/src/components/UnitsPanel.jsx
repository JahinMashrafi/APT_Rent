import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, DoorOpen, Calendar, Banknote } from "lucide-react";
import api from "../services/api";
import AvailabilityBadge from "./AvailabilityBadge.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import Avatar from "./ui/Avatar.jsx";

/** Landlord view: occupied units (tenant, rent, lease end) and vacant units (listing status). */
export default function UnitsPanel() {
  const { t, formatCurrency, formatDate, formatNumber } = useLanguage();
  const [state, setState] = useState({ loading: true, data: null });

  useEffect(() => {
    let cancelled = false;
    api.units.list()
      .then((res) => { if (!cancelled) setState({ loading: false, data: res?.data ?? null }); })
      .catch(() => { if (!cancelled) setState({ loading: false, data: null }); });
    return () => { cancelled = true; };
  }, []);

  if (state.loading) return <p className="fx-help">{t("common.loading")}</p>;
  if (!state.data) return <p className="fx-error">{t("units.loadError")}</p>;
  const { occupied, vacant } = state.data;
  const floor = (u) => (u.floor != null ? t("units.floor", { floor: u.floor, total: u.total_floors ?? "?" }) : null);

  return (
    <div>
      <div className="unit-summary">
        <div className="unit-stat"><Building2 size={18} /><strong>{formatNumber(occupied.length)}</strong><span>{t("units.occupied")}</span></div>
        <div className="unit-stat"><DoorOpen size={18} /><strong>{formatNumber(vacant.length)}</strong><span>{t("units.vacant")}</span></div>
      </div>

      <h2 className="unit-heading">{t("units.occupied")}</h2>
      {occupied.length === 0 ? <p className="fx-help">{t("units.noneOccupied")}</p> : (
        <div className="unit-grid">
          {occupied.map((u) => (
            <article className="unit-card" key={u.property_id}>
              <header>
                <Link to={`/property/${u.property_id}`} className="unit-title">{u.address}</Link>
                <AvailabilityBadge status="rented" />
              </header>
              {floor(u) && <span className="fx-help">{floor(u)}</span>}
              <div className="unit-tenant">
                <Avatar className="unit-avatar" src={u.tenant?.profile_picture_url} name={u.tenant?.name} />
                <span><strong>{u.tenant?.name ?? t("units.noTenant")}</strong>{u.tenant?.phone && <><br /><span className="fx-help">{u.tenant.phone}</span></>}</span>
              </div>
              <dl className="unit-facts">
                <div><dt><Banknote size={14} /> {t("units.rent")}</dt><dd>{formatCurrency(u.rent)}</dd></div>
                <div><dt><Calendar size={14} /> {t("units.leaseEnd")}</dt><dd>{u.lease_end ? formatDate(`${u.lease_end}T00:00:00`, "medium") : "—"}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}

      <h2 className="unit-heading">{t("units.vacant")}</h2>
      {vacant.length === 0 ? <p className="fx-help">{t("units.noneVacant")}</p> : (
        <div className="unit-grid">
          {vacant.map((u) => (
            <article className="unit-card" key={u.property_id}>
              <header>
                <Link to={`/property/${u.property_id}`} className="unit-title">{u.address}</Link>
                <AvailabilityBadge status={u.availability_status} />
              </header>
              {floor(u) && <span className="fx-help">{floor(u)}</span>}
              <dl className="unit-facts">
                <div><dt><Banknote size={14} /> {t("units.rent")}</dt><dd>{formatCurrency(u.rent)}</dd></div>
                <div><dt>{t("units.listingStatus")}</dt><dd>{t(`units.listing.${u.listing_status}`)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}