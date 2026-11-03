// Shared helpers for the dispute / maintenance panels and detail pages.

export const DISPUTE_PILL = { open: "pill-open", resolved: "pill-done" };
export const MAINT_PILL = { open: "pill-open", in_progress: "pill-progress", resolved: "pill-done", cancelled: "pill-muted" };
export const PRIORITY_PILL = { low: "pill-muted", medium: "pill-progress", high: "pill-open", urgent: "pill-danger" };

const same = (a, b) => a != null && b != null && String(a) === String(b);

/** Leases where `userId` plays `role` ("tenant" | "landlord"), optionally only the given statuses. */
export function contractsForRole(contracts, userId, role, statuses) {
  return (contracts ?? []).filter((c) => {
    const mine = role === "landlord" ? same(c.owner?.user_id, userId) : same(c.tenant?.user_id, userId);
    return mine && (!statuses || statuses.includes(c.status));
  });
}

/** The other party of a lease, from the viewer's side. */
export function counterpartyOf(contract, userId) {
  return same(contract.owner?.user_id, userId) ? contract.tenant : contract.owner;
}