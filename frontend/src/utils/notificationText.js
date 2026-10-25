import { formatDateLong, formatTime } from "./tour.js";

const TITLES = {
  "Tenant proposed lease terms": "notifText.tenantProposedTitle",
  "Landlord counter-offered lease terms": "notifText.landlordCounterTitle",
  "Tenant accepted lease terms": "notifText.tenantAcceptedTitle",
  "Landlord accepted lease terms": "notifText.landlordAcceptedTitle",
  "New lease agreement": "notifText.leaseIssuedTitle",
  "Contract signed": "notifText.signedTitle",
  "Security deposit received": "notifText.depositTitle",
  "New review": "notifText.reviewTitle",
  "Rent payment received": "notifText.rentPaidTitle",
  "Cash pickup requested": "notifText.cashTitle",
  "Verification approved": "notifText.verifyApprovedTitle",
  "Verification rejected": "notifText.verifyRejectedTitle",
  "Dispute resolved": "notifText.disputeTitle",
  "New message": "notifText.newMessageTitle",
  "New tour request": "notifText.tourRequestedTitle",
  "Tour slots proposed": "notifText.tourProposedTitle",
  "Tour confirmed": "notifText.tourConfirmedTitle",
  "Tour times rejected": "notifText.tourRejectedTitle",
  "Tour cancelled": "notifText.tourCancelledTitle",
};

const whoLong = (word) => (word === "tenant" ? "notifText.whoTenant" : "notifText.whoLandlord");

// Reads date parts straight from the text (never new Date(), which shifts the
// day across time zones).
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const niceDate = (raw, lang) => {
  const text = String(raw).trim();
  let iso = null;
  const a = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const b = text.match(/^[A-Za-z]{3} ([A-Za-z]{3}) (\d{1,2}) (\d{4})/);
  if (a) iso = `${a[1]}-${a[2]}-${a[3]}`;
  else if (b && MONTHS[b[1]]) iso = `${b[3]}-${String(MONTHS[b[1]]).padStart(2, "0")}-${b[2].padStart(2, "0")}`;
  return iso ? formatDateLong(iso, lang) : raw;
};

const RULES = [
  {
    re: /^(Tenant proposed|Landlord counter-offered) rent ৳([\d.]+) and deposit ৳([\d.]+)\.$/,
    key: (m) => (m[1] === "Tenant proposed" ? "notifText.proposedBody" : "notifText.counterBody"),
    params: (m, c) => ({
      who: c.t(m[1] === "Tenant proposed" ? "notifText.whoTenantShort" : "notifText.whoLandlordShort"),
      rent: c.formatCurrency(Number(m[2])),
      deposit: c.formatCurrency(Number(m[3])),
    }),
  },
  {
    re: /^The (tenant|landlord) accepted contract #(\d+)\. Both parties can now sign\.$/,
    key: "notifText.acceptedBody",
    params: (m, c) => ({ who: c.t(whoLong(m[1])), id: c.digits(m[2]) }),
  },
  {
    re: /^A draft lease was issued for property #(\d+)\. Please review and sign\.$/,
    key: "notifText.leaseIssuedBody",
    params: (m, c) => ({ id: c.digits(m[1]) }),
  },
  {
    re: /^The (tenant|owner|landlord) signed contract #(\d+)\.$/,
    key: "notifText.signedBody",
    params: (m, c) => ({ who: c.t(whoLong(m[1] === "tenant" ? "tenant" : "landlord")), id: c.digits(m[2]) }),
  },
  {
    re: /^Deposit paid for contract #(\d+)\. Lease is now active\.$/,
    key: "notifText.depositBody",
    params: (m, c) => ({ id: c.digits(m[1]) }),
  },
  {
    re: /^You received a (\d+)-star review\.$/,
    key: "notifText.reviewBody",
    params: (m, c) => ({ stars: c.digits(m[1]) }),
  },
  {
    re: /^Tenant paid BDT ([\d.]+) for contract #(\d+)\.$/,
    key: "notifText.rentPaidBody",
    params: (m, c) => ({ amount: c.formatCurrency(Number(m[1])), id: c.digits(m[2]) }),
  },
  {
    re: /^Tenant scheduled a cash rent pickup for (.+) \((.+)\)\.$/,
    key: "notifText.cashBody",
    params: (m, c) => ({ date: niceDate(m[1], c.lang), slot: m[2] }),
  },
  { re: /^Your identity documents have been verified\.$/, key: "notifText.verifyApprovedBody", params: () => ({}) },
  {
    re: /^(.+?) wants to view (.+?)\. Note: ([\s\S]+)$/,
    key: "notifText.tourRequestedNote",
    params: (m) => ({ name: m[1], address: m[2], note: m[3] }),
  },
  {
    re: /^(.+) wants to view (.+)\.$/,
    key: "notifText.tourRequestedBody",
    params: (m) => ({ name: m[1], address: m[2] }),
  },
  {
    re: /^The landlord proposed 3 tour times for (.+)\. Please pick one or reject them\.$/,
    key: "notifText.tourProposedBody",
    params: (m) => ({ address: m[1] }),
  },
  {
    re: /^Tenant confirmed a tour for (.+) at (.+)\.$/,
    key: "notifText.tourConfirmedBody",
    params: (m, c) => ({
      date: niceDate(m[1], c.lang),
      time: /^\d{1,2}:\d{2}/.test(m[2]) ? formatTime(m[2], c.lang) : m[2],
    }),
  },
  {
    re: /^The tenant asked for different times: ([\s\S]+)$/,
    key: "notifText.tourRejectedReason",
    params: (m) => ({ reason: m[1] }),
  },
  {
    re: /^The tenant rejected the proposed times and is waiting for new ones\.$/,
    key: "notifText.tourRejectedBody",
    params: () => ({}),
  },
  {
    re: /^A tour was cancelled: ([\s\S]+)$/,
    key: "notifText.tourCancelledReason",
    params: (m) => ({ reason: m[1] }),
  },
  { re: /^A scheduled tour was cancelled\.$/, key: "notifText.tourCancelledBody", params: () => ({}) },
];

/** localizeNotification(n, useLanguage()) -> { title, message } */
export function localizeNotification(n, c) {
  const titleKey = TITLES[n?.title];
  const title = titleKey ? c.t(titleKey) : n?.title;

  let message = n?.message;
  const text = String(n?.message ?? "");
  for (const rule of RULES) {
    const m = text.match(rule.re);
    if (m) {
      message = c.t(typeof rule.key === "function" ? rule.key(m) : rule.key, rule.params(m, c));
      break;
    }
  }
  return { title, message };
}