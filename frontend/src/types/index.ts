export interface User {
  id: string;
  tenant_id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  role: "super_admin" | "admin" | "vendedor";
  activo: boolean;
  created_at: string;
}

export interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  plan: string;
  activo: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

export interface Raffle {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  cantidad_numeros: number;
  numero_digitos: number;
  precio_boleta: number;
  estado: "borrador" | "activa" | "finalizada" | "cancelada";
  fecha_sorteo: string | null;
  loteria_asociada: string | null;
  numero_ganador: string | null;
  imagen_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RaffleWithStats extends Raffle {
  tickets_disponibles: number;
  tickets_reservados: number;
  tickets_vendidos: number;
}

export interface Ticket {
  id: string;
  raffle_id: string;
  numero: string;
  estado: "disponible" | "reservado" | "vendido";
  reservado_por: string | null;
  reservado_hasta: string | null;
  vendido_a_nombre: string | null;
  vendido_a_telefono: string | null;
  vendido_a_email: string | null;
}

export interface Purchase {
  id: string;
  tenant_id: string;
  ticket_id: string;
  raffle_id: string;
  usuario_id: string | null;
  comprador_nombre: string;
  comprador_telefono: string | null;
  comprador_email: string | null;
  monto: number;
  metodo_pago: string | null;
  notas: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface BuyerInfo {
  nombre: string;
  telefono?: string;
  email?: string;
  metodo_pago?: string;
  notas?: string;
}

export interface DashboardMetrics {
  ingresos_totales: number;
  total_compras: number;
  rifas_activas: number;
  tickets_disponibles: number;
  tickets_reservados: number;
  tickets_vendidos: number;
}

export interface TicketSummary {
  total: number;
  disponibles: number;
  reservados: number;
  vendidos: number;
}
