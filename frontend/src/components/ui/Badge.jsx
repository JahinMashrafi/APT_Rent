// =============================================================================
// Badge.jsx — Reusable status badge component
// =============================================================================
// Props:
//   variant: "active" | "pending" | "approved" | "rejected" | "banned" |
//            "paid" | "overdue" | "due" | "occupied" | "vacant" | "verified"
//   size: "sm" | "md"  (default: "md")
//   children: React.ReactNode  (overrides auto-label)
// =============================================================================
import { useLanguage } from "../../i18n/LanguageContext.jsx";
const variantStyles = {
  active:    "bg-emerald-100 text-emerald-700",
  approved:  "bg-emerald-100 text-emerald-700",
  paid:      "bg-emerald-100 text-emerald-700",
  occupied:  "bg-emerald-100 text-emerald-700",
  verified:  "bg-emerald-100 text-emerald-700",
  pending:   "bg-amber-100 text-amber-700",
  due:       "bg-amber-100 text-amber-700",
  reviewed:  "bg-blue-100 text-blue-700",
  info:      "bg-blue-100 text-blue-700",
  rejected:  "bg-red-100 text-red-700",
  banned:    "bg-red-100 text-red-700",
  overdue:   "bg-red-100 text-red-700",
  vacant:    "bg-slate-100 text-slate-600",
  hidden:    "bg-slate-100 text-slate-500",
};

const defaultLabels = {
  active: "Active",
  approved: "Approved",
  paid: "Paid",
  occupied: "Occupied",
  verified: "Verified",
  pending: "Pending",
  due: "Due",
  reviewed: "Reviewed",
  info: "Info",
  rejected: "Rejected",
  banned: "Banned",
  overdue: "Overdue",
  vacant: "Vacant",
  hidden: "Hidden",
};

const sizeStyles = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

export default function Badge({ variant = "info", size = "md", children }) {
  const { tx } = useLanguage();
  const style = variantStyles[variant] ?? "bg-slate-100 text-slate-600";
  const label = children ?? tx("status", variant, variant);
  // const label = children ?? defaultLabels[variant] ?? variant;

  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${style} ${sizeStyles[size]}`}>
      {label}
    </span>
  );
}
