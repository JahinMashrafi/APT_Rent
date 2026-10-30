import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useBreadcrumbLabels } from "../hooks/useBreadcrumbLabel.js";

// Pages where a breadcrumb trail would only be noise (home, auth, full-height inbox).
const HIDDEN = new Set(["/", "/login", "/register", "/forgot-password", "/reset-password", "/inbox"]);

const TOP = {
  dashboard: "crumb.browse", browse: "crumb.browse", listings: "crumb.browse",
  applications: "crumb.applications", contracts: "crumb.contracts", rent: "crumb.rent",
  "tour-requests": "crumb.tourRequests", landlord: "crumb.landlord", admin: "crumb.admin",
  profile: "crumb.profile", saved: "crumb.saved",
};

/** Builds [{ key | text, to? }] for a pathname. The last item is the current page (no link). */
function buildTrail(pathname, labels) {
  const parts = pathname.split("/").filter(Boolean);
  const [first, second] = parts;
  const browse = { key: "crumb.browse", to: "/dashboard" };

  if (first === "property" || first === "apartments") {
    return [browse, { text: labels.get(pathname) ?? null, key: "crumb.property", vars: { id: second } }];
  }
  if (first === "tour" || first === "lease") {
    const propertyPath = `/property/${second}`;
    return [
      browse,
      { text: labels.get(propertyPath) ?? null, key: "crumb.property", vars: { id: second }, to: propertyPath },
      { key: first === "tour" ? "crumb.tour" : "crumb.lease" },
    ];
  }
  if (first === "users") return [{ key: "crumb.profile" }];
  if (TOP[first] && parts.length === 1) return [{ key: TOP[first] }];
  return null;
}

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const labels = useBreadcrumbLabels();

  if (HIDDEN.has(pathname)) return null;
  const trail = buildTrail(pathname, labels);
  if (!trail) return null;

  const all = [{ key: "crumb.home", to: "/", icon: true }, ...trail];
  return (
    <nav className="breadcrumbs" aria-label={t("crumb.label")}>
      <ol>
        {all.map((crumb, index) => {
          const isLast = index === all.length - 1;
          const text = crumb.text || t(crumb.key, crumb.vars);
          return (
            <Fragment key={`${crumb.key}-${index}`}>
              <li>
                {isLast || !crumb.to ? (
                  <span aria-current={isLast ? "page" : undefined}>{text}</span>
                ) : (
                  <Link to={crumb.to}>
                    {crumb.icon && <Home size={13} aria-hidden="true" />}
                    {text}
                  </Link>
                )}
              </li>
              {!isLast && <li aria-hidden="true" className="breadcrumbs-sep"><ChevronRight size={13} /></li>}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}