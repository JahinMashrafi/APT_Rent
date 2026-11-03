const pool = require("../config/db.js");

// "Active" contract = status 'active' (set by contractController after deposit).
// Want completed leases to remain reviewable? Change to ["active", "completed"].
const ACTIVE_CONTRACT_STATUSES = ["active"];

const REASONS = Object.freeze({
  OK: "OK",
  SELF: "SELF_REVIEW",
  NO_CONTRACT: "NO_ACTIVE_CONTRACT",
  SAME_ROLE: "SAME_ROLE",
  DUPLICATE: "ALREADY_REVIEWED",
});

/**
 * Single source of truth for "may viewer review target?".
 * Used by BOTH the profile endpoint (to drive the UI) and createReview (to enforce).
 */
async function getReviewEligibility(viewerId, targetId, db = pool) {
  const viewer = Number(viewerId);
  const target = Number(targetId);

  if (!Number.isInteger(viewer) || !Number.isInteger(target)) {
    return { canReview: false, reason: REASONS.NO_CONTRACT };
  }
  // Rule: users cannot review themselves
  if (viewer === target) return { canReview: false, reason: REASONS.SELF };

  // Rule: an ACTIVE contract must connect the two users (either direction)
  const { rows } = await db.query(
    `SELECT contract_id, owner_id, tenant_id
       FROM contracts
      WHERE status::text = ANY($3::text[])
        AND owner_id <> tenant_id
        AND ((owner_id = $1 AND tenant_id = $2) OR (owner_id = $2 AND tenant_id = $1))
      ORDER BY contract_id DESC
      LIMIT 1`,
    [viewer, target, ACTIVE_CONTRACT_STATUSES],
  );
  if (rows.length === 0) return { canReview: false, reason: REASONS.NO_CONTRACT };

  // Rule: cross-role only. Roles are derived from the contract itself.
  const c = rows[0];
  const reviewerRole = Number(c.owner_id) === viewer ? "landlord" : "tenant";
  const reviewedRole = reviewerRole === "landlord" ? "tenant" : "landlord";
  if (reviewerRole === reviewedRole) return { canReview: false, reason: REASONS.SAME_ROLE };

  // One review per reviewer -> reviewed pair (matches your existing behavior)
  const dup = await db.query(
    `SELECT 1 FROM reviews WHERE reviewer_id = $1 AND reviewed_user_id = $2 LIMIT 1`,
    [viewer, target],
  );
  if (dup.rows.length > 0) return { canReview: false, reason: REASONS.DUPLICATE };

  return { canReview: true, reason: REASONS.OK, contractId: c.contract_id, reviewerRole, reviewedRole };
}

module.exports = { getReviewEligibility, REASONS, ACTIVE_CONTRACT_STATUSES };