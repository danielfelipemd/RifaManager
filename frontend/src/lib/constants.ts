export const API_URL = import.meta.env.VITE_API_URL || "https://rifamanager-api.huem98.easypanel.host/api/v1";
export const WS_URL = import.meta.env.VITE_WS_URL || "wss://rifamanager-api.huem98.easypanel.host/ws";

export const TICKET_STATES = {
  disponible: { label: "Disponible", color: "bg-green-500", textColor: "text-green-700" },
  reservado: { label: "Reservado", color: "bg-yellow-500", textColor: "text-yellow-700" },
  vendido: { label: "Vendido", color: "bg-red-500", textColor: "text-red-700" },
} as const;

export const RAFFLE_STATES = {
  borrador: { label: "Borrador", color: "bg-gray-500" },
  activa: { label: "Activa", color: "bg-green-500" },
  finalizada: { label: "Finalizada", color: "bg-blue-500" },
  cancelada: { label: "Cancelada", color: "bg-red-500" },
} as const;
