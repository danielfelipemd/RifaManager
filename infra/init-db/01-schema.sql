-- ============================================================
-- RifaManager - Database Schema
-- ============================================================

-- TENANTS
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    plan        VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    config      JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

-- USERS
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre          VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    telefono        VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'vendedor'
                        CHECK (role IN ('super_admin', 'admin', 'vendedor')),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);

-- RAFFLES (RIFAS)
CREATE TABLE raffles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre              VARCHAR(255) NOT NULL,
    descripcion         TEXT,
    cantidad_numeros    INTEGER NOT NULL CHECK (cantidad_numeros > 0),
    numero_digitos      INTEGER NOT NULL CHECK (numero_digitos IN (2, 3, 4)),
    precio_boleta       NUMERIC(12, 2) NOT NULL CHECK (precio_boleta > 0),
    estado              VARCHAR(20) NOT NULL DEFAULT 'borrador'
                            CHECK (estado IN ('borrador', 'activa', 'finalizada', 'cancelada')),
    fecha_sorteo        TIMESTAMPTZ,
    loteria_asociada    VARCHAR(100),
    numero_ganador      VARCHAR(10),
    imagen_url          TEXT,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raffles_tenant ON raffles(tenant_id);
CREATE INDEX idx_raffles_estado ON raffles(tenant_id, estado);
CREATE INDEX idx_raffles_created_by ON raffles(created_by);
CREATE INDEX idx_raffles_fecha ON raffles(fecha_sorteo);

-- TICKETS (BOLETAS)
CREATE TABLE tickets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raffle_id           UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    numero              VARCHAR(10) NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'disponible'
                            CHECK (estado IN ('disponible', 'reservado', 'vendido')),
    reservado_por       UUID REFERENCES users(id),
    reservado_hasta     TIMESTAMPTZ,
    vendido_a_nombre    VARCHAR(255),
    vendido_a_telefono  VARCHAR(20),
    vendido_a_email     VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ticket_raffle_numero UNIQUE (raffle_id, numero)
);

CREATE INDEX idx_tickets_raffle ON tickets(raffle_id);
CREATE INDEX idx_tickets_estado ON tickets(raffle_id, estado);
CREATE INDEX idx_tickets_reservado_hasta ON tickets(reservado_hasta)
    WHERE estado = 'reservado';
CREATE INDEX idx_tickets_reservado_por ON tickets(reservado_por);

-- PURCHASES (COMPRAS)
CREATE TABLE purchases (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_id           UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    raffle_id           UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
    usuario_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    comprador_nombre    VARCHAR(255) NOT NULL,
    comprador_telefono  VARCHAR(20),
    comprador_email     VARCHAR(255),
    monto               NUMERIC(12, 2) NOT NULL,
    metodo_pago         VARCHAR(50),
    notas               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_purchase_ticket UNIQUE (ticket_id)
);

CREATE INDEX idx_purchases_tenant ON purchases(tenant_id);
CREATE INDEX idx_purchases_raffle ON purchases(raffle_id);
CREATE INDEX idx_purchases_fecha ON purchases(tenant_id, created_at);
CREATE INDEX idx_purchases_usuario ON purchases(usuario_id);

-- LOTTERY RESULTS
CREATE TABLE lottery_results (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    loteria     VARCHAR(100) NOT NULL,
    numero      VARCHAR(10) NOT NULL,
    fecha       DATE NOT NULL,
    serie       VARCHAR(10),
    raw_data    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_lottery_result UNIQUE (tenant_id, loteria, fecha, numero)
);

CREATE INDEX idx_lottery_results_fecha ON lottery_results(fecha);

-- NOTIFICATION LOGS
CREATE TABLE notification_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    canal           VARCHAR(20) NOT NULL CHECK (canal IN ('email', 'whatsapp', 'sms')),
    destinatario    VARCHAR(255) NOT NULL,
    asunto          VARCHAR(255),
    contenido       TEXT NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente', 'enviado', 'fallido')),
    intentos        INTEGER NOT NULL DEFAULT 0,
    max_intentos    INTEGER NOT NULL DEFAULT 3,
    error_msg       TEXT,
    referencia_tipo VARCHAR(50),
    referencia_id   UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enviado_at      TIMESTAMPTZ
);

CREATE INDEX idx_notifications_tenant ON notification_logs(tenant_id);
CREATE INDEX idx_notifications_pendientes ON notification_logs(estado)
    WHERE estado = 'pendiente';

-- AUDIT LOGS
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    accion          VARCHAR(100) NOT NULL,
    entidad         VARCHAR(100) NOT NULL,
    entidad_id      UUID,
    datos_antes     JSONB,
    datos_despues   JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_fecha ON audit_logs(tenant_id, created_at);

-- LOTTERY PROVIDERS (global, not per-tenant)
CREATE TABLE lottery_providers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(255) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    url_oficial VARCHAR(500),
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    dia_sorteo  VARCHAR(50),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lottery_providers_slug ON lottery_providers(slug);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_raffles_updated_at BEFORE UPDATE ON raffles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
