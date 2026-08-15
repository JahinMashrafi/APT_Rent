-- =========================================================
-- APT RENT - PostgreSQL Schema
-- Rental Management System (Admin / Landlord / Tenant)
-- =========================================================

-- Clean re-run support (drop in dependency order)
DROP TABLE IF EXISTS history CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS property_photos CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS occupation_type CASCADE;
DROP TYPE IF EXISTS property_type_enum CASCADE;
DROP TYPE IF EXISTS furnish_type_enum CASCADE;
DROP TYPE IF EXISTS availability_status_enum CASCADE;
DROP TYPE IF EXISTS appointment_status_enum CASCADE;
DROP TYPE IF EXISTS contract_status_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;
DROP TYPE IF EXISTS payment_method_enum CASCADE;

-- =========================================================
-- ENUM TYPES
-- =========================================================

CREATE TYPE user_role AS ENUM ('admin', 'landlord', 'tenant');

CREATE TYPE occupation_type AS ENUM ('student', 'service_holder', 'businessman');

CREATE TYPE property_type_enum AS ENUM ('apartment', 'house', 'studio', 'room', 'commercial');

CREATE TYPE furnish_type_enum AS ENUM ('furnished', 'semi_furnished', 'unfurnished');

CREATE TYPE availability_status_enum AS ENUM ('available', 'rented', 'unavailable');

CREATE TYPE appointment_status_enum AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

CREATE TYPE contract_status_enum AS ENUM ('draft', 'active', 'completed', 'terminated');

CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TYPE payment_method_enum AS ENUM ('cash', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'card');

-- =========================================================
-- USERS  (admin / landlord / tenant share the same profile shape)
-- =========================================================

CREATE TABLE users (
    user_id             SERIAL PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    role                user_role NOT NULL,

    -- login credentials
    email               VARCHAR(150) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    contact_number      VARCHAR(20)  NOT NULL UNIQUE,

    -- profile
    profile_picture_url TEXT,
    nid_photo_url       TEXT,
    address             TEXT,

    -- occupation (conditional fields depending on occupation)
    occupation                  occupation_type,
    institution_name            VARCHAR(200),   -- student: school/college/university
    student_id_card_url         TEXT,           -- student: ID card copy
    workplace_name               VARCHAR(200),   -- service holder: place
    job_id_card_url              TEXT,           -- service holder: ID card
    trade_license_url            TEXT,           -- businessman: trade license

    is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- make sure occupation-specific fields match the chosen occupation
    CONSTRAINT chk_occupation_fields CHECK (
        (occupation = 'student'        AND institution_name IS NOT NULL) OR
        (occupation = 'service_holder' AND workplace_name IS NOT NULL)   OR
        (occupation = 'businessman'    AND trade_license_url IS NOT NULL) OR
        (occupation IS NULL)
    )
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- =========================================================
-- REVIEWS  (user review - one user reviews another, e.g. tenant reviews landlord)
-- =========================================================

CREATE TABLE reviews (
    review_id       SERIAL PRIMARY KEY,
    reviewer_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewed_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_no_self_review CHECK (reviewer_id <> reviewed_user_id)
);

CREATE INDEX idx_reviews_reviewed_user ON reviews(reviewed_user_id);

-- =========================================================
-- PROPERTIES
-- =========================================================

CREATE TABLE properties (
    property_id         SERIAL PRIMARY KEY,
    owner_id             INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tenant_id            INTEGER REFERENCES users(user_id) ON DELETE SET NULL, -- current tenant, if rented

    address              TEXT NOT NULL,
    latitude             DECIMAL(9,6),
    longitude            DECIMAL(9,6),

    details              TEXT,
    facilities           TEXT[],           -- e.g. {'Lift','Generator','Parking'}
    rate                 NUMERIC(12,2) NOT NULL,
    property_type        property_type_enum NOT NULL,
    bedroom               SMALLINT,
    bathroom              SMALLINT,
    size_sqft             NUMERIC(10,2),

    availability_date     DATE,
    availability_status   availability_status_enum NOT NULL DEFAULT 'available',
    furnish_type          furnish_type_enum,
    nearest_transport     VARCHAR(200),
    deposit               NUMERIC(12,2),

    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_properties_status ON properties(availability_status);

-- Property photos (minimum 3 enforced at application layer; table allows many)
CREATE TABLE property_photos (
    photo_id      SERIAL PRIMARY KEY,
    property_id   INTEGER NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    photo_url     TEXT NOT NULL,
    uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_photos_property ON property_photos(property_id);

-- =========================================================
-- APPOINTMENTS  (property viewing requests)
-- =========================================================

CREATE TABLE appointments (
    appointment_id   SERIAL PRIMARY KEY,
    owner_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tenant_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    new_tenant_id     INTEGER REFERENCES users(user_id) ON DELETE SET NULL, -- if tenant is being replaced
    property_id       INTEGER NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,

    appointment_date  DATE NOT NULL,
    appointment_time  TIME NOT NULL,
    status            appointment_status_enum NOT NULL DEFAULT 'pending',

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_property ON appointments(property_id);
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);

-- =========================================================
-- CONTRACTS
-- =========================================================

CREATE TABLE contracts (
    contract_id       SERIAL PRIMARY KEY,
    owner_id           INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    property_id        INTEGER NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    tenant_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    rate               NUMERIC(12,2) NOT NULL,
    start_date         DATE NOT NULL,
    end_date           DATE NOT NULL,
    owner_signature_url  TEXT,
    tenant_signature_url TEXT,
    status             contract_status_enum NOT NULL DEFAULT 'draft',

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_contract_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_contracts_property ON contracts(property_id);
CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);

-- =========================================================
-- PAYMENTS
-- =========================================================

CREATE TABLE payments (
    payment_id       SERIAL PRIMARY KEY,
    owner_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tenant_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    property_id       INTEGER NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    contract_id       INTEGER NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,

    amount            NUMERIC(12,2) NOT NULL,
    payment_method    payment_method_enum NOT NULL,
    payment_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status            payment_status_enum NOT NULL DEFAULT 'pending',

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_contract ON payments(contract_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);

-- =========================================================
-- HISTORY  (payment/deposit tracking per contract)
-- =========================================================

CREATE TABLE history (
    history_id         SERIAL PRIMARY KEY,
    owner_id            INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tenant_id           INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    property_id         INTEGER NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    contract_id         INTEGER NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,

    payment_status      BOOLEAN NOT NULL DEFAULT FALSE,   -- true = paid, false = due
    due_amount          NUMERIC(12,2) DEFAULT 0,
    deposit_amount      NUMERIC(12,2),
    deposit_paid_at     TIMESTAMPTZ,
    deadline            DATE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_contract ON history(contract_id);
CREATE INDEX idx_history_tenant ON history(tenant_id);

-- =========================================================
-- Auto-update "updated_at" trigger (reusable)
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_history_updated_at BEFORE UPDATE ON history
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- END OF SCHEMA
-- =========================================================
