-- Allow tenants to request a viewing without choosing a date or time.
-- The landlord supplies concrete options in the proposal phase.

BEGIN;

ALTER TABLE appointments
  ALTER COLUMN appointment_date DROP NOT NULL,
  ALTER COLUMN appointment_time DROP NOT NULL;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS chk_appointments_date_time_pair;

ALTER TABLE appointments
  ADD CONSTRAINT chk_appointments_date_time_pair
  CHECK (
    (appointment_date IS NULL AND appointment_time IS NULL)
    OR (appointment_date IS NOT NULL AND appointment_time IS NOT NULL)
  );

COMMIT;
