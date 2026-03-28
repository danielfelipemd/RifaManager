-- ============================================================
-- Seed Data for Development
-- ============================================================

-- Platform tenant (for super admin)
INSERT INTO tenants (id, nombre, slug, plan) VALUES
    ('00000000-0000-0000-0000-000000000001', 'RifaManager Platform', 'platform', 'enterprise');

-- Super Admin (password: Admin123)
INSERT INTO users (id, tenant_id, nombre, email, telefono, password_hash, role) VALUES
    ('00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000001',
     'Super Administrador',
     'superadmin@rifamanager.com',
     '+573000000000',
     '$2b$12$CzWx.CpcPsLRxmmgnfQDq.s3yxGouOnJ5a1PsyeR.p0P35ZN/gVe6',
     'super_admin');

-- Demo tenant
INSERT INTO tenants (id, nombre, slug, plan) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rifas Demo', 'rifas-demo', 'pro');

-- Demo admin user (password: admin123)
INSERT INTO users (id, tenant_id, nombre, email, telefono, password_hash, role) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Admin Demo',
     'admin@demo.com',
     '+573001234567',
     '$2b$12$LJ3m4ys3Lk0TSwMCkGKYMeFBfhRbyDNMOAqhFSVOAEOxIHJREFyVy',
     'admin');

-- Colombian lottery providers
INSERT INTO lottery_providers (nombre, slug, url_oficial, dia_sorteo) VALUES
    ('Lotería de Bogotá', 'loteria-de-bogota', 'https://loteriadebogota.com/', 'Jueves'),
    ('Lotería de Medellín', 'loteria-de-medellin', 'https://loteriademedellin.com.co/', 'Viernes'),
    ('Lotería del Valle', 'loteria-del-valle', 'https://loteriadelvalle.com/', 'Miércoles'),
    ('Lotería de Cundinamarca', 'loteria-de-cundinamarca', 'https://www.loteriadecundinamarca.com.co/', 'Lunes'),
    ('Lotería de Boyacá', 'loteria-de-boyaca', 'https://loteriadeboyaca.gov.co/', 'Sábado'),
    ('Lotería del Tolima', 'loteria-del-tolima', 'https://loteriadeltolima.com/', 'Lunes'),
    ('Lotería del Cauca', 'loteria-del-cauca', 'https://loteriadelcauca.gov.co/', 'Sábado'),
    ('Lotería del Huila', 'loteria-del-huila', 'https://www.loteriadelhuila.com/', 'Lunes'),
    ('Lotería de Manizales', 'loteria-de-manizales', 'https://loteriademanizales.com/', 'Miércoles'),
    ('Lotería del Quindío', 'loteria-del-quindio', 'https://loteriadelquindio.com/', 'Jueves'),
    ('Lotería de Risaralda', 'loteria-de-risaralda', 'https://loteriaderisaralda.com/', 'Viernes'),
    ('Lotería de Santander', 'loteria-de-santander', 'https://loteriasantander.gov.co/', 'Viernes'),
    ('Lotería del Meta', 'loteria-del-meta', 'https://loteriadelmeta.gov.co/', 'Miércoles'),
    ('Lotería de la Cruz Roja', 'loteria-de-la-cruz-roja', 'https://loteriacruzroja.com/', 'Martes'),
    ('Baloto', 'baloto', 'https://baloto.com/', 'Miércoles y Sábado');
