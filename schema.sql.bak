-- ============================================================================
-- APT RENT — PostgreSQL Schema (REFERENCE ONLY)
--
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
--
-- Regenerated from the live database on 2026-10-02 with:
--   pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges -n public
--
-- Do NOT pipe this into psql. It is a description of the database as it
-- currently exists, not a recipe for building one. To change the schema,
-- add a new file under backend/migrations/ and apply that instead —
-- migrations are additive and safe to run against live data.
-- ============================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: appointment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appointment_status_enum AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled'
);


--
-- Name: availability_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.availability_status_enum AS ENUM (
    'available',
    'rented',
    'unavailable',
    'archived'
);


--
-- Name: contract_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contract_status_enum AS ENUM (
    'draft',
    'active',
    'completed',
    'terminated',
    'signed_by_owner',
    'signed_by_tenant',
    'fully_signed'
);


--
-- Name: furnish_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.furnish_type_enum AS ENUM (
    'furnished',
    'semi_furnished',
    'unfurnished'
);


--
-- Name: occupation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.occupation_type AS ENUM (
    'student',
    'service_holder',
    'businessman',
    'unemployed',
    'retired',
    'other'
);


--
-- Name: payment_method_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method_enum AS ENUM (
    'cash',
    'bkash',
    'nagad',
    'rocket',
    'bank_transfer',
    'card'
);


--
-- Name: payment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status_enum AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
);


--
-- Name: property_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.property_type_enum AS ENUM (
    'apartment',
    'house',
    'studio',
    'room',
    'commercial'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'landlord',
    'tenant'
);


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    application_id integer NOT NULL,
    property_id integer NOT NULL,
    tenant_id integer NOT NULL,
    monthly_income numeric NOT NULL,
    occupation character varying(100),
    family_size smallint NOT NULL,
    message text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: applications_application_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.applications_application_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: applications_application_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.applications_application_id_seq OWNED BY public.applications.application_id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    appointment_id integer NOT NULL,
    owner_id integer NOT NULL,
    tenant_id integer NOT NULL,
    new_tenant_id integer,
    property_id integer NOT NULL,
    appointment_date date NOT NULL,
    appointment_time time without time zone NOT NULL,
    status public.appointment_status_enum DEFAULT 'pending'::public.appointment_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    appointment_batch_id text,
    cancellation_reason text
);


--
-- Name: appointments_appointment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_appointment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_appointment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_appointment_id_seq OWNED BY public.appointments.appointment_id;


--
-- Name: cash_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_schedules (
    schedule_id integer NOT NULL,
    contract_id integer NOT NULL,
    tenant_id integer NOT NULL,
    collection_date date NOT NULL,
    time_preference character varying(20) NOT NULL,
    notes text,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_collection_day CHECK (((EXTRACT(day FROM collection_date) >= (1)::numeric) AND (EXTRACT(day FROM collection_date) <= (5)::numeric)))
);


--
-- Name: cash_schedules_schedule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cash_schedules_schedule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cash_schedules_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cash_schedules_schedule_id_seq OWNED BY public.cash_schedules.schedule_id;


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    contract_id integer NOT NULL,
    owner_id integer NOT NULL,
    property_id integer NOT NULL,
    tenant_id integer NOT NULL,
    rate numeric(12,2) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    owner_signature_url text,
    tenant_signature_url text,
    status public.contract_status_enum DEFAULT 'draft'::public.contract_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    terms_and_conditions text,
    CONSTRAINT chk_contract_dates CHECK ((end_date > start_date))
);


--
-- Name: contracts_contract_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contracts_contract_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contracts_contract_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contracts_contract_id_seq OWNED BY public.contracts.contract_id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    conversation_id integer NOT NULL,
    property_id integer,
    participant_one integer NOT NULL,
    participant_two integer NOT NULL,
    last_message_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_conversation_distinct_participants CHECK ((participant_one <> participant_two))
);


--
-- Name: conversations_conversation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversations_conversation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversations_conversation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversations_conversation_id_seq OWNED BY public.conversations.conversation_id;


--
-- Name: disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disputes (
    dispute_id integer NOT NULL,
    complainant_id integer NOT NULL,
    reported_user_id integer NOT NULL,
    contract_id integer,
    reason character varying(255) NOT NULL,
    details text NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: disputes_dispute_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.disputes_dispute_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: disputes_dispute_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.disputes_dispute_id_seq OWNED BY public.disputes.dispute_id;


--
-- Name: history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.history (
    history_id integer NOT NULL,
    owner_id integer NOT NULL,
    tenant_id integer NOT NULL,
    property_id integer NOT NULL,
    contract_id integer NOT NULL,
    payment_status boolean DEFAULT false NOT NULL,
    due_amount numeric(12,2) DEFAULT 0,
    deposit_amount numeric(12,2),
    deposit_paid_at timestamp with time zone,
    deadline date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    billing_month date
);


--
-- Name: history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.history_history_id_seq OWNED BY public.history.history_id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    message_id integer NOT NULL,
    conversation_id integer NOT NULL,
    sender_id integer NOT NULL,
    message_text text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_message_text_length CHECK (((length(btrim(message_text)) >= 1) AND (length(btrim(message_text)) <= 2000)))
);


--
-- Name: messages_message_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_message_id_seq OWNED BY public.messages.message_id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    notification_id integer NOT NULL,
    user_id integer NOT NULL,
    notification_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    link_url text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_notification_id_seq OWNED BY public.notifications.notification_id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    payment_id integer NOT NULL,
    owner_id integer NOT NULL,
    tenant_id integer NOT NULL,
    property_id integer NOT NULL,
    contract_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_method public.payment_method_enum NOT NULL,
    payment_date timestamp with time zone DEFAULT now() NOT NULL,
    status public.payment_status_enum DEFAULT 'pending'::public.payment_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    transaction_reference text,
    receipt_url text
);


--
-- Name: payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_payment_id_seq OWNED BY public.payments.payment_id;


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    property_id integer NOT NULL,
    owner_id integer NOT NULL,
    tenant_id integer,
    address text NOT NULL,
    latitude numeric(9,6),
    longitude numeric(9,6),
    details text,
    facilities text[],
    rate numeric(12,2) NOT NULL,
    property_type public.property_type_enum NOT NULL,
    bedroom smallint,
    bathroom smallint,
    size_sqft numeric(10,2),
    availability_date date,
    availability_status public.availability_status_enum DEFAULT 'available'::public.availability_status_enum NOT NULL,
    furnish_type public.furnish_type_enum,
    nearest_transport character varying(200),
    deposit numeric(12,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    floor smallint,
    total_floors smallint,
    is_hidden boolean DEFAULT false NOT NULL
);


--
-- Name: properties_property_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.properties_property_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: properties_property_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.properties_property_id_seq OWNED BY public.properties.property_id;


--
-- Name: property_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_photos (
    photo_id integer NOT NULL,
    property_id integer NOT NULL,
    photo_url text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: property_photos_photo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.property_photos_photo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: property_photos_photo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.property_photos_photo_id_seq OWNED BY public.property_photos.photo_id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    review_id integer NOT NULL,
    reviewer_id integer NOT NULL,
    reviewed_user_id integer NOT NULL,
    rating smallint NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_no_self_review CHECK ((reviewer_id <> reviewed_user_id)),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: reviews_review_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_review_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_review_id_seq OWNED BY public.reviews.review_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    contact_number character varying(20) NOT NULL,
    profile_picture_url text,
    nid_photo_url text,
    address text,
    occupation public.occupation_type,
    institution_name character varying(200),
    student_id_card_url text,
    workplace_name character varying(200),
    job_id_card_url text,
    trade_license_url text,
    is_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_landlord boolean NOT NULL,
    is_tenant boolean NOT NULL,
    is_admin boolean NOT NULL,
    documents_submitted_at timestamp with time zone,
    verification_rejection_reason text,
    CONSTRAINT users_is_admin_check CHECK ((is_admin = ANY (ARRAY[true, false]))),
    CONSTRAINT users_is_landlord_check CHECK ((is_landlord = ANY (ARRAY[true, false]))),
    CONSTRAINT users_is_tenant_check CHECK ((is_tenant = ANY (ARRAY[true, false])))
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: applications application_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications ALTER COLUMN application_id SET DEFAULT nextval('public.applications_application_id_seq'::regclass);


--
-- Name: appointments appointment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN appointment_id SET DEFAULT nextval('public.appointments_appointment_id_seq'::regclass);


--
-- Name: cash_schedules schedule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_schedules ALTER COLUMN schedule_id SET DEFAULT nextval('public.cash_schedules_schedule_id_seq'::regclass);


--
-- Name: contracts contract_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts ALTER COLUMN contract_id SET DEFAULT nextval('public.contracts_contract_id_seq'::regclass);


--
-- Name: conversations conversation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations ALTER COLUMN conversation_id SET DEFAULT nextval('public.conversations_conversation_id_seq'::regclass);


--
-- Name: disputes dispute_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes ALTER COLUMN dispute_id SET DEFAULT nextval('public.disputes_dispute_id_seq'::regclass);


--
-- Name: history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history ALTER COLUMN history_id SET DEFAULT nextval('public.history_history_id_seq'::regclass);


--
-- Name: messages message_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN message_id SET DEFAULT nextval('public.messages_message_id_seq'::regclass);


--
-- Name: notifications notification_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN notification_id SET DEFAULT nextval('public.notifications_notification_id_seq'::regclass);


--
-- Name: payments payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN payment_id SET DEFAULT nextval('public.payments_payment_id_seq'::regclass);


--
-- Name: properties property_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties ALTER COLUMN property_id SET DEFAULT nextval('public.properties_property_id_seq'::regclass);


--
-- Name: property_photos photo_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_photos ALTER COLUMN photo_id SET DEFAULT nextval('public.property_photos_photo_id_seq'::regclass);


--
-- Name: reviews review_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN review_id SET DEFAULT nextval('public.reviews_review_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (application_id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (appointment_id);


--
-- Name: cash_schedules cash_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_schedules
    ADD CONSTRAINT cash_schedules_pkey PRIMARY KEY (schedule_id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (contract_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (conversation_id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (dispute_id);


--
-- Name: history history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_pkey PRIMARY KEY (history_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (message_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (property_id);


--
-- Name: property_photos property_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_photos
    ADD CONSTRAINT property_photos_pkey PRIMARY KEY (photo_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (review_id);


--
-- Name: users users_contact_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_contact_number_key UNIQUE (contact_number);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_appointments_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_batch ON public.appointments USING btree (appointment_batch_id);


--
-- Name: idx_appointments_property; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_property ON public.appointments USING btree (property_id);


--
-- Name: idx_appointments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_tenant ON public.appointments USING btree (tenant_id);


--
-- Name: idx_cash_schedules_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_schedules_contract ON public.cash_schedules USING btree (contract_id);


--
-- Name: idx_contracts_property; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_property ON public.contracts USING btree (property_id);


--
-- Name: idx_contracts_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_tenant ON public.contracts USING btree (tenant_id);


--
-- Name: idx_conversations_one_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_one_activity ON public.conversations USING btree (participant_one, last_message_at DESC);


--
-- Name: idx_conversations_two_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_two_activity ON public.conversations USING btree (participant_two, last_message_at DESC);


--
-- Name: idx_history_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_contract ON public.history USING btree (contract_id);


--
-- Name: idx_history_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_tenant ON public.history USING btree (tenant_id);


--
-- Name: idx_messages_conversation_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation_created ON public.messages USING btree (conversation_id, created_at DESC);


--
-- Name: idx_messages_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_unread ON public.messages USING btree (conversation_id) WHERE (is_read = false);


--
-- Name: idx_payments_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_contract ON public.payments USING btree (contract_id);


--
-- Name: idx_payments_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_tenant ON public.payments USING btree (tenant_id);


--
-- Name: idx_properties_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_owner ON public.properties USING btree (owner_id);


--
-- Name: idx_properties_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_status ON public.properties USING btree (availability_status);


--
-- Name: idx_property_photos_property; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_property_photos_property ON public.property_photos USING btree (property_id);


--
-- Name: idx_reviews_reviewed_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_reviewed_user ON public.reviews USING btree (reviewed_user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: uq_conversations_pairing; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_conversations_pairing ON public.conversations USING btree (property_id, LEAST(participant_one, participant_two), GREATEST(participant_one, participant_two));


--
-- Name: contracts trg_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: history trg_history_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_history_updated_at BEFORE UPDATE ON public.history FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: properties trg_properties_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: applications applications_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(property_id);


--
-- Name: applications applications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(user_id);


--
-- Name: appointments appointments_new_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_new_tenant_id_fkey FOREIGN KEY (new_tenant_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: appointments appointments_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: appointments appointments_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(property_id) ON DELETE CASCADE;


--
-- Name: appointments appointments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: cash_schedules cash_schedules_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_schedules
    ADD CONSTRAINT cash_schedules_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(contract_id) ON DELETE CASCADE;


--
-- Name: cash_schedules cash_schedules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_schedules
    ADD CONSTRAINT cash_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: contracts contracts_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: contracts contracts_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(property_id) ON DELETE CASCADE;


--
-- Name: contracts contracts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: conversations conversations_participant_one_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant_one_fkey FOREIGN KEY (participant_one) REFERENCES public.users(user_id);


--
-- Name: conversations conversations_participant_two_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_participant_two_fkey FOREIGN KEY (participant_two) REFERENCES public.users(user_id);


--
-- Name: conversations conversations_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(property_id);


--
-- Name: disputes disputes_complainant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_complainant_id_fkey FOREIGN KEY (complainant_id) REFERENCES public.users(user_id);


--
-- Name: disputes disputes_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(contract_id);


--
-- Name: disputes disputes_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(user_id);


--
-- Name: history history_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(contract_id) ON DELETE CASCADE;


--
-- Name: history history_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: history history_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(property_id) ON DELETE CASCADE;


--
-- Name: history history_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(conversation_id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(user_id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: payments payments_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(contract_id) ON DELETE CASCADE;


--
-- Name: payments payments_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: payments payments_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(property_id) ON DELETE CASCADE;


--
-- Name: payments payments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: properties properties_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: properties properties_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: property_photos property_photos_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_photos
    ADD CONSTRAINT property_photos_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(property_id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewed_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewed_user_id_fkey FOREIGN KEY (reviewed_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


