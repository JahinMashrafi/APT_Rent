-- =========================================================
-- APT RENT - Migration 004: Optional application fields
--
-- Lets a tenant apply without stating their income or family
-- size. The Apply button on a property page is a one-click
-- action; demanding monthly_income and family_size up front
-- made it fail with a 422 the UI could only show as a generic
-- error. occupation and message were already nullable.
--
-- The controller (applicationController.js) is relaxed in the
-- same change: property_id stays required, everything else is
-- passed through as NULL when the tenant skips it.
--
-- DROP NOT NULL is a no-op on an already-nullable column, so
-- this is safe to re-run against a live database.
-- =========================================================

BEGIN;

ALTER TABLE applications
    ALTER COLUMN monthly_income DROP NOT NULL,
    ALTER COLUMN family_size DROP NOT NULL;

COMMIT;
