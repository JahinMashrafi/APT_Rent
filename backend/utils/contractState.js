const SIGNABLE_STATUSES = ["draft", "signed_by_owner", "signed_by_tenant"];

/** pg returns DATE as a local-midnight Date; JSON turns it into a UTC timestamp
 *  (the day-shift bug). Always send "YYYY-MM-DD". */
const toDateOnly = (value) => {
  if (value instanceof Date) {
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${m}-${d}`;
  }
  return value == null ? null : String(value).slice(0, 10);
};

const deriveNegotiationState = (c) => {
  switch (c.negotiation_status) {
    case "accepted":
      return "TERMS_ACCEPTED";
    case "tenant_proposed":
    case "proposed": // legacy rows: proposer unknown, assume tenant so the LANDLORD must respond
      return "TENANT_PROPOSAL_SENT";
    case "owner_proposed":
      return "LANDLORD_PROPOSAL_SENT";
    default: // 'none': on a draft this is the landlord's original offer
      return c.status === "draft" ? "LANDLORD_PROPOSAL_SENT" : "NONE";
  }
};

/** The server decides what `userId` may do. The UI only reads these flags. */
const contractPermissions = (c, userId) => {
  const uid = Number(userId);
  const isOwner = Number(c.owner_id) === uid;
  const isTenant = Number(c.tenant_id) === uid;
  const isParty = isOwner || isTenant;
  const state = deriveNegotiationState(c);
  const negotiating = c.status === "draft" && state !== "TERMS_ACCEPTED";
  const proposerIsMe =
    (state === "TENANT_PROPOSAL_SENT" && isTenant) ||
    (state === "LANDLORD_PROPOSAL_SENT" && isOwner);
  const ownSignature = isOwner ? c.owner_signature_url : isTenant ? c.tenant_signature_url : null;

  return {
    viewer_role: isOwner ? "owner" : isTenant ? "tenant" : "none",
    negotiation_state: state,
    can_accept: isParty && negotiating && !proposerIsMe,
    can_counter: isParty && negotiating && !proposerIsMe,
    awaiting_other_party: isParty && negotiating && proposerIsMe,
    can_sign:
      isParty && state === "TERMS_ACCEPTED" && SIGNABLE_STATUSES.includes(c.status) && !ownSignature,
  };
};

module.exports = { SIGNABLE_STATUSES, toDateOnly, deriveNegotiationState, contractPermissions };