import client from "./client";

export interface PlatformStats {
  total_tenants: number;
  total_users: number;
  total_raffles: number;
  total_purchases: number;
  total_revenue: number;
  tenants_activos: number;
}

export interface TenantDetail {
  id: string;
  nombre: string;
  slug: string;
  plan: string;
  activo: boolean;
  config: Record<string, unknown>;
  created_at: string;
  total_users: number;
  total_raffles: number;
  total_purchases: number;
  total_revenue: number;
}

export interface TenantUser {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  role: string;
  activo: boolean;
  created_at: string;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data } = await client.get<PlatformStats>("/admin/stats");
  return data;
}

export async function getAllTenants(): Promise<TenantDetail[]> {
  const { data } = await client.get<TenantDetail[]>("/admin/tenants");
  return data;
}

export async function createTenant(payload: {
  nombre: string;
  slug: string;
  plan: string;
  admin_nombre: string;
  admin_email: string;
  admin_password: string;
  admin_telefono?: string;
}): Promise<TenantDetail> {
  const { data } = await client.post<TenantDetail>("/admin/tenants", payload);
  return data;
}

export async function updateTenant(
  id: string,
  payload: { nombre?: string; plan?: string; activo?: boolean }
): Promise<TenantDetail> {
  const { data } = await client.put<TenantDetail>(`/admin/tenants/${id}`, payload);
  return data;
}

export async function deactivateTenant(id: string): Promise<void> {
  await client.delete(`/admin/tenants/${id}`);
}

export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const { data } = await client.get<TenantUser[]>(`/admin/tenants/${tenantId}/users`);
  return data;
}
