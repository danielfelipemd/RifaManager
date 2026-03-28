export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

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
