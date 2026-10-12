-- =========================================================
-- APT RENT - Migration 002: Tour request negotiation
--
-- Adds the one column the tenant-first tour flow needs on top
-- of the existing `appointments` table.
--
-- Why this exists
-- ---------------
-- appointments was built for a landlord-first flow: the landlord
-- proposes 3 slots, the tenant confirms one. The requested flow is
-- the other way round — the tenant asks to visit, the landlord
-- offers 3 alternatives, the tenant picks or rejects, and a
-- rejection sends the landlord back to offering.
--
-- Two constraints shape the design:
--
--   1. appointment_date and appointment_time are NOT NULL, so a
--      date-free "I'd like to view this flat" cannot be stored.
--      The tenant therefore names a preferred date with the
--      request, which satisfies the constraint with no surgery.
--
--   2. There is no way to tell a tenant's requested slot from a
--      landlord's proposed one, because both are just 'pending'
--      rows sharing a batch id. `proposed_by` records who put
--      this particular slot on the table.
--
-- How the state machine is encoded
-- -------------------------------
--   request   proposed_by = tenant_id   status stays 'pending'
--             for the whole negotiation; it is never cancelled
--             by a rejection, only by confirm or explicit cancel.
--             This is the row the landlord's "Tour requests" page
--             lists as an open request.
--
--   proposal  proposed_by = owner_id     exactly 3 per round, all
--             sharing the request's appointment_batch_id.
--
--   Rejecting cancels only the 3 proposals in the current round;
--   the request stays pending, so the landlord can immediately
--   offer a new set. That is the loop.
--
-- Existing rows keep proposed_by = NULL. All 3 of them are already
-- status = 'cancelled', so there is nothing to backfill and nothing
-- for them to interfere with.
--
-- Every statement is additive and IF NOT EXISTS, so this is safe to
-- re-run against a live database.
-- =========================================================

BEGIN;

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS proposed_by INTEGER REFERENCES users(user_id);

-- The landlord's "open tour requests" query: pending rows this
-- landlord owns, restricted to tenant-proposed ones.
CREATE INDEX IF NOT EXISTS idx_appointments_owner_proposed_by
    ON appointments (owner_id, proposed_by, status);

-- The tenant's negotiation view: one request plus every round of
-- proposals filed under it.
CREATE INDEX IF NOT EXISTS idx_appointments_batch
    ON appointments (appointment_batch_id, status);

-- Stops a tenant from opening a second live request for the same
-- flat. The partial predicate is what makes "open" mean pending:
-- once a request is confirmed or cancelled, the tenant may ask
-- again about the same property.
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_open_request_per_tenant
    ON appointments (tenant_id, property_id)
    WHERE status = 'pending' AND proposed_by IS NOT NULL AND proposed_by = tenant_id;

COMMIT;
