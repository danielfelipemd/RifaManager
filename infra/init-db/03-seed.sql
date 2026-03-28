-- ============================================================
-- Seed Data for Development
-- ============================================================

-- Demo tenant
INSERT INTO tenants (id, nombre, slug, plan) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rifas Demo', 'rifas-demo', 'pro');

-- Admin user (password: admin123)
-- Hash generated with bcrypt
INSERT INTO users (id, tenant_id, nombre, email, telefono, password_hash, role) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Admin Demo',
     'admin@demo.com',
     '+573001234567',
     '$2b$12$LJ3m4ys3Lk0TSwMCkGKYMeFBfhRbyDNMOAqhFSVOAEOxIHJREFyVy',
     'admin');
