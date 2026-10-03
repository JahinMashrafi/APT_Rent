-- =========================================================
-- APT RENT - Migration 001: Conversations & Messages
--
-- RECONCILIATION MIGRATION. Read this first.
--
-- The `conversations` and `messages` tables ALREADY EXIST in the live
-- database, created outside schema.sql. Rather than replacing them
-- (which would drop real rows and any other code depending on them),
-- this migration adds the indexes and constraints the messaging
-- feature needs on top of the shape that is already there.
--
-- ACTUAL LIVE SHAPE (verified against the database, not schema.sql):
--
--   conversations(
--     conversation_id serial PK,
--     property_id     int NULL REFERENCES properties(property_id),
--     participant_one int NOT NULL REFERENCES users(user_id),
--     participant_two int NOT NULL REFERENCES users(user_id),
--     last_message_at timestamptz NOT NULL DEFAULT now()
--   )
--
--   messages(
--     message_id      serial PK,
--     conversation_id int NOT NULL REFERENCES conversations(conversation_id),
--     sender_id       int NOT NULL REFERENCES users(user_id),
--     message_text    text NOT NULL,
--     is_read         boolean NOT NULL DEFAULT false,
--     created_at      timestamptz NOT NULL DEFAULT now()
--   )
--
-- Two deliberate design consequences, both of which the controller
-- code follows rather than fighting:
--
--   1. Participants are stored as an unordered pair
--      (participant_one / participant_two) with no landlord/tenant
--      column. Role is resolved at the application layer, from
--      properties.owner_id and users.is_landlord / is_tenant. The
--      pairing lookup and the unique index below are therefore
--      order-agnostic, so a thread is found no matter which slot the
--      landlord happens to occupy.
--
--   2. Read state is a boolean (is_read), not a timestamp. That
--      supports the unread badge and the "seen" tick but cannot show
--      *when* a message was read. Fine for now; if that is ever
--      needed, add `read_at timestamptz` alongside rather than
--      replacing is_read.
--
-- Every statement is additive and IF NOT EXISTS, so this is safe to
-- re-run against a live database.
-- =========================================================

BEGIN;

-- -------------------------------------------------------------
-- One thread per (property, user pair)
--
-- Order-agnostic via LEAST/GREATEST so that (A,B) and (B,A) are the
-- same pairing. Without this, a tenant opening a thread from the
-- property page and the landlord replying from their dashboard could
-- each create one, and the pair would fork into two threads.
--
-- NOTE: NULL property_id rows are excluded from uniqueness by SQL's
-- default NULLS DISTINCT semantics. A conversation with no property
-- can therefore repeat, which is the right call — those are general
-- threads not tied to a listing.
-- -------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_pairing
    ON conversations (
        property_id,
        LEAST(participant_one, participant_two),
        GREATEST(participant_one, participant_two)
    );

-- Inbox list ordering: most recent activity first, per participant.
CREATE INDEX IF NOT EXISTS idx_conversations_one_activity
    ON conversations (participant_one, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_two_activity
    ON conversations (participant_two, last_message_at DESC);

-- Thread fetch: messages in one conversation, newest first.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages (conversation_id, created_at DESC);

-- Unread badge. Partial, so it only indexes rows that are unread.
CREATE INDEX IF NOT EXISTS idx_messages_unread
    ON messages (conversation_id) WHERE is_read = false;

-- -------------------------------------------------------------
-- Guard rails
-- -------------------------------------------------------------
-- Blank messages are rejected in the controller first; this is the
-- backstop for anything that reaches the table another way.
ALTER TABLE messages
    DROP CONSTRAINT IF EXISTS chk_message_text_length;
ALTER TABLE messages
    ADD CONSTRAINT chk_message_text_length
    CHECK (length(btrim(message_text)) BETWEEN 1 AND 2000);

-- A conversation needs two distinct people.
ALTER TABLE conversations
    DROP CONSTRAINT IF EXISTS chk_conversation_distinct_participants;
ALTER TABLE conversations
    ADD CONSTRAINT chk_conversation_distinct_participants
    CHECK (participant_one <> participant_two);

COMMIT;

-- =========================================================
-- Related stale-file warning
--
-- schema.sql is NOT a reliable description of this database and
-- must not be used to create or recreate it. It disagrees with the
-- live schema in at least seven ways:
--
--   - users: describes a `role` ENUM; live table has BOTH that enum
--     and boolean is_landlord / is_tenant / is_admin, which is what
--     the controllers actually read
--   - missing entirely: applications, notifications, disputes,
--     cash_schedules, conversations, messages
--   - appointments: missing appointment_batch_id and
--     cancellation_reason, both written by appointmentController.js
--   - properties.availability_status: no 'archived' value, which
--     appointmentController.js filters on
--   - its leading DROP TABLE ... CASCADE block destroys live data
--     if run
--
-- Regenerating it from the live database is worth doing as a separate
-- task. It was left alone here because it is unrelated to messaging
-- and rewriting it carelessly would put live data at risk.
-- =========================================================