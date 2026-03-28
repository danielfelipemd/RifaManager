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
  comision_porcentaje: number | null;
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

export interface PlatformConfig {
  clave: string;
  valor: string;
  descripcion: string | null;
}

export interface PaymentRequest {
  id: string;
  tenant_id: string;
  raffle_id: string;
  monto: number;
  porcentaje: number;
  estado: "pendiente" | "aprobado" | "rechazado";
  metodo_pago: string;
  comprobante_ref: string | null;
  notas_cliente: string | null;
  notas_admin: string | null;
  aprobado_por: string | null;
  created_at: string;
  aprobado_at: string | null;
  tenant_nombre: string | null;
  raffle_nombre: string | null;
}

export interface CommissionPreview {
  valor_rifa: number;
  porcentaje: number;
  comision: number;
}

// Stats
export async function getPlatformStats(): Promise<PlatformStats> {
  const { data } = await client.get<PlatformStats>("/admin/stats");
  return data;
}

// Tenants
export async function getAllTenants(): Promise<TenantDetail[]> {
  const { data } = await client.get<TenantDetail[]>("/admin/tenants");
  return data;
}

export async function createTenant(payload: {
  nombre: string; slug: string; plan: string; comision_porcentaje?: number;
  admin_nombre: string; admin_email: string; admin_password: string; admin_telefono?: string;
}): Promise<TenantDetail> {
  const { data } = await client.post<TenantDetail>("/admin/tenants", payload);
  return data;
}

export async function updateTenant(id: string, payload: { nombre?: string; plan?: string; activo?: boolean; comision_porcentaje?: number }): Promise<TenantDetail> {
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

// Config
export async function getAllConfig(): Promise<PlatformConfig[]> {
  const { data } = await client.get<PlatformConfig[]>("/admin/config");
  return data;
}

export async function getConfig(clave: string): Promise<PlatformConfig> {
  const { data } = await client.get<PlatformConfig>(`/admin/config/${clave}`);
  return data;
}

export async function updateConfig(clave: string, valor: string): Promise<PlatformConfig> {
  const { data } = await client.put<PlatformConfig>(`/admin/config/${clave}`, { valor });
  return data;
}

// Commission
export async function getCommissionPreview(valorRifa: number): Promise<CommissionPreview> {
  const { data } = await client.get<CommissionPreview>("/admin/commission-preview", { params: { valor_rifa: valorRifa } });
  return data;
}

// Payments
export async function createPaymentRequest(raffleId: string, comprobante_ref?: string, notas_cliente?: string): Promise<PaymentRequest> {
  const { data } = await client.post<PaymentRequest>("/admin/payments/request", { raffle_id: raffleId, comprobante_ref, notas_cliente });
  return data;
}

export async function getMyPaymentRequests(): Promise<PaymentRequest[]> {
  const { data } = await client.get<PaymentRequest[]>("/admin/payments/my-requests");
  return data;
}

export async function getAllPaymentRequests(estado?: string): Promise<PaymentRequest[]> {
  const { data } = await client.get<PaymentRequest[]>("/admin/payments/all", { params: estado ? { estado } : undefined });
  return data;
}

export async function approvePayment(paymentId: string, notas_admin?: string): Promise<PaymentRequest> {
  const { data } = await client.post<PaymentRequest>(`/admin/payments/${paymentId}/approve`, { notas_admin });
  return data;
}

export async function rejectPayment(paymentId: string, notas_admin?: string): Promise<PaymentRequest> {
  const { data } = await client.post<PaymentRequest>(`/admin/payments/${paymentId}/reject`, { notas_admin });
  return data;
}
