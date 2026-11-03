import { formatDateLong, formatTime } from "./tour.js";

const TITLES = {
  "New rental application": "notifText.applicationReceivedTitle",
  "Application update": "notifText.applicationUpdateTitle",
  "New dispute filed": "notifText.disputeFiledTitle",
  "Tour rescheduled": "notifText.tourRescheduledTitle",
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
  "Dispute filed against you": "notifText.disputeAgainstTitle",
  "New maintenance request": "notifText.maintRequestTitle",
  "New maintenance notice": "notifText.maintNoticeTitle",
  "Maintenance update": "notifText.maintUpdateTitle",
  "New message": "notifText.newMessageTitle",
  "New tour request": "notifText.tourRequestedTitle",
  "Tour slots proposed": "notifText.tourProposedTitle",
  "Tour confirmed": "notifText.tourConfirmedTitle",
  "Tour times rejected": "notifText.tourRejectedTitle",
  "Tour cancelled": "notifText.tourCancelledTitle",
};

const whoLong = (word) => (word === "tenant" ? "notifText.whoTenant" : "notifText.whoLandlord");
const translatedAddress = (address, addressTranslations = {}) => {
  const source = String(address ?? "").trim();
  return addressTranslations[source] || source;
};

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
    re: /^A tenant applied for your property \(application #(\d+)\)\.$/,
    key: "notifText.applicationReceivedBody",
    params: (m, c) => ({ id: c.digits(m[1]) }),
  },
  {
    re: /^Your application for (.+?) was marked \"([^\"]+)\"\.$/,
    key: "notifText.applicationUpdateBody",
    params: (m, c, addressTranslations) => ({
      address: translatedAddress(m[1], addressTranslations),
      status: c.tx("status", m[2].toLowerCase(), m[2]),
    }),
  },
  {
    re: /^Dispute #(\d+): ([\s\S]+)$/,
    key: "notifText.disputeFiledBody",
    params: (m, c) => ({ id: c.digits(m[1]), reason: m[2] }),
  },
  {
    re: /^Maintenance #(\d+): ([\s\S]+)$/,
    key: "notifText.maintBody",
    params: (m, c) => ({ id: c.digits(m[1]), title: m[2] }),
  },
  {
    re: /^Maintenance #(\d+) was marked "(open|in_progress|resolved|cancelled)"\.$/,
    key: "notifText.maintUpdateBody",
    params: (m, c) => ({ id: c.digits(m[1]), status: c.t(`cases.maint.status.${m[2]}`) }),
  },
  {
    re: /^A tour for property #(\d+) moved to (\d{4}-\d{2}-\d{2}) at (.+?)\. Please confirm the new time\.(?: Reason: ([\s\S]+))?$/,
    key: (m) => (m[4] ? "notifText.tourRescheduledReasonBody" : "notifText.tourRescheduledBody"),
    params: (m, c) => ({
      id: c.digits(m[1]),
      date: niceDate(m[2], c.lang),
      time: /^\d{1,2}:\d{2}/.test(m[3]) ? formatTime(m[3], c.lang) : m[3],
      reason: m[4] || "",
    }),
  },
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
    params: (m, c, addressTranslations) => ({ name: m[1], address: translatedAddress(m[2], addressTranslations), note: m[3] }),
  },
  {
    re: /^(.+) wants to view (.+)\.$/,
    key: "notifText.tourRequestedBody",
    params: (m, c, addressTranslations) => ({ name: m[1], address: translatedAddress(m[2], addressTranslations) }),
  },
  {
    re: /^The landlord proposed 3 tour times for (.+)\. Please pick one or reject them\.$/,
    key: "notifText.tourProposedBody",
    params: (m, c, addressTranslations) => ({ address: translatedAddress(m[1], addressTranslations) }),
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

/**
 * Return address fragments embedded in known notification templates so the
 * existing address-translation API can translate them in one cached batch.
 */
export function extractNotificationAddresses(notifications = []) {
  const addresses = [];
  for (const notification of notifications) {
    const message = String(notification?.message ?? "");
    let match = message.match(/^Your application for (.+?) was marked \"[^\"]+\"\.$/);
    if (match) addresses.push(match[1]);
    match = message.match(/^.+? wants to view (.+?)\. Note: [\s\S]+$/);
    if (match) addresses.push(match[1]);
    else {
      match = message.match(/^.+? wants to view (.+?)\.$/);
      if (match) addresses.push(match[1]);
    }
    match = message.match(/^The landlord proposed 3 tour times for (.+?)\. Please pick one or reject them\.$/);
    if (match) addresses.push(match[1]);
  }
  return [...new Set(addresses.map((address) => address.trim()).filter(Boolean))].slice(0, 20);
}

/** localizeNotification(n, useLanguage(), addressTranslations) -> { title, message } */
export function localizeNotification(n, c, addressTranslations = {}) {
  const titleKey = TITLES[n?.title];
  const title = titleKey ? c.t(titleKey) : n?.title;

  let message = n?.message;
  const text = String(n?.message ?? "");
  for (const rule of RULES) {
    const m = text.match(rule.re);
    if (m) {
      message = c.t(typeof rule.key === "function" ? rule.key(m) : rule.key, rule.params(m, c, addressTranslations));
      break;
    }
  }
  return { title, message };
}