-- ============================================================
-- FSM - Field Service Management
-- Migration 001: Schema inicial completo
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. COMPANIES (Clientes SaaS / Multi-tenant)
-- ============================================================
CREATE TABLE companies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    plan        VARCHAR(50)  NOT NULL DEFAULT 'starter', -- starter, pro, enterprise
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. USERS (Gestores / Admins)
-- ============================================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'manager', -- manager, admin, owner
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_company ON users(company_id);

-- ============================================================
-- 3. TECHNICIANS (Equipe de Rua)
-- ============================================================
CREATE TABLE technicians (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    phone            VARCHAR(50)  NOT NULL,
    status           VARCHAR(50)  NOT NULL DEFAULT 'offline',
                     -- offline | online | in_transit | busy | break | delayed
    vehicle_type     VARCHAR(50)  NOT NULL DEFAULT 'motorcycle',
                     -- motorcycle | car | van | truck
    current_location GEOMETRY(Point, 4326),
    heading          NUMERIC(5,2),         -- graus 0-360
    speed_kmh        NUMERIC(6,2),
    whatsapp_number  VARCHAR(50),
    fcm_token        VARCHAR(512),         -- Push notifications mobile
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_technicians_company     ON technicians(company_id);
CREATE INDEX idx_technicians_status      ON technicians(status);
CREATE INDEX idx_technicians_location    ON technicians USING GIST(current_location);

-- ============================================================
-- 4. SERVICE ORDERS (Ordens de Serviço)
-- ============================================================
CREATE TABLE service_orders (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                 UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    technician_id              UUID         REFERENCES technicians(id) ON DELETE SET NULL,
    client_name                VARCHAR(255) NOT NULL,
    client_phone               VARCHAR(50)  NOT NULL,
    client_email               VARCHAR(255),
    address                    TEXT         NOT NULL,
    coordinates                GEOMETRY(Point, 4326) NOT NULL,
    status                     VARCHAR(50)  NOT NULL DEFAULT 'pending',
                               -- pending | routed | in_transit | in_progress | completed | canceled
    priority                   VARCHAR(50)  NOT NULL DEFAULT 'medium',
                               -- low | medium | high | emergency
    service_type               VARCHAR(100),
    description                TEXT,
    estimated_duration_minutes INT          NOT NULL DEFAULT 60,
    actual_duration_minutes    INT,
    time_window_start          TIMESTAMPTZ  NOT NULL,
    time_window_end            TIMESTAMPTZ  NOT NULL,
    sequence_order             INT,
    scheduled_arrival_at       TIMESTAMPTZ,
    actual_arrival_at          TIMESTAMPTZ,
    started_at                 TIMESTAMPTZ,
    completed_at               TIMESTAMPTZ,
    tracking_token             VARCHAR(64)  UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    notes                      TEXT,
    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_so_company      ON service_orders(company_id);
CREATE INDEX idx_so_technician   ON service_orders(technician_id);
CREATE INDEX idx_so_status       ON service_orders(status);
CREATE INDEX idx_so_priority     ON service_orders(priority);
CREATE INDEX idx_so_date         ON service_orders(time_window_start);
CREATE INDEX idx_so_coordinates  ON service_orders USING GIST(coordinates);
CREATE INDEX idx_so_tracking     ON service_orders(tracking_token);

-- ============================================================
-- 5. ROUTE HISTORY (Trilha de Auditoria de Localização)
-- ============================================================
CREATE TABLE route_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id  UUID         NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    location       GEOMETRY(Point, 4326) NOT NULL,
    heading        NUMERIC(5,2),
    speed_kmh      NUMERIC(6,2),
    recorded_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rh_technician   ON route_history(technician_id);
CREATE INDEX idx_rh_recorded_at  ON route_history(recorded_at DESC);
CREATE INDEX idx_rh_location     ON route_history USING GIST(location);

-- ============================================================
-- 6. ROUTING EVENTS (Log de Redespacho)
-- ============================================================
CREATE TABLE routing_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    technician_id   UUID        REFERENCES technicians(id) ON DELETE SET NULL,
    trigger_type    VARCHAR(100) NOT NULL,
                    -- TECHNICIAN_COMPLETED_EARLY | EMERGENCY_OS_CREATED | TECHNICIAN_DELAYED
    trigger_data    JSONB,
    orders_affected INT         NOT NULL DEFAULT 0,
    recalc_duration_ms INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_re_company    ON routing_events(company_id);
CREATE INDEX idx_re_trigger    ON routing_events(trigger_type);
CREATE INDEX idx_re_created_at ON routing_events(created_at DESC);

-- ============================================================
-- 7. NOTIFICATION LOG (Auditoria de Mensagens WhatsApp)
-- ============================================================
CREATE TABLE notification_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    service_order_id UUID       REFERENCES service_orders(id) ON DELETE SET NULL,
    channel        VARCHAR(50)  NOT NULL DEFAULT 'whatsapp', -- whatsapp | sms | push
    recipient      VARCHAR(100) NOT NULL,
    message_type   VARCHAR(100) NOT NULL, -- TECHNICIAN_DISPATCHED | ETA_UPDATE | COMPLETED
    status         VARCHAR(50)  NOT NULL DEFAULT 'sent', -- sent | delivered | failed
    external_id    VARCHAR(255),
    sent_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nl_service_order ON notification_log(service_order_id);

-- ============================================================
-- Triggers: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_technicians_updated_at
  BEFORE UPDATE ON technicians
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_service_orders_updated_at
  BEFORE UPDATE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
