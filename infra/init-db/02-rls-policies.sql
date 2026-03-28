-- ============================================================
-- Row-Level Security Policies
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_results ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TENANTS: Allow access without tenant context (for registration and super_admin)
-- ============================================================
CREATE POLICY tenants_select ON tenants
    FOR SELECT
    USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR id = current_setting('app.current_tenant_id', true)::UUID
    );

CREATE POLICY tenants_modify ON tenants
    FOR ALL
    USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR id = current_setting('app.current_tenant_id', true)::UUID
    )
    WITH CHECK (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR id = current_setting('app.current_tenant_id', true)::UUID
    );

-- ============================================================
-- USERS: Allow SELECT without tenant context (for login authentication)
-- ============================================================
CREATE POLICY users_select ON users
    FOR SELECT
    USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id = current_setting('app.current_tenant_id', true)::UUID
    );

CREATE POLICY users_modify ON users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================================
-- STANDARD TENANT ISOLATION (remaining tables)
-- ============================================================
CREATE POLICY tenant_isolation_raffles ON raffles
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_tickets ON tickets
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_purchases ON purchases
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_notifications ON notification_logs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_audit ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_lottery ON lottery_results
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
