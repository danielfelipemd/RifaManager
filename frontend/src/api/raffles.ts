import client from "./client";
import type { Raffle, RaffleWithStats } from "@/types";

export async function getRaffles(): Promise<Raffle[]> {
  const { data } = await client.get<Raffle[]>("/raffles");
  return data;
}

export async function getRaffle(id: string): Promise<RaffleWithStats> {
  const { data } = await client.get<RaffleWithStats>(`/raffles/${id}`);
  return data;
}

export async function createRaffle(payload: {
  nombre: string;
  descripcion?: string;
  cantidad_numeros: number;
  numero_digitos: number;
  precio_boleta: number;
  fecha_sorteo?: string;
  loteria_asociada?: string;
}): Promise<Raffle> {
  const { data } = await client.post<Raffle>("/raffles", payload);
  return data;
}

export async function updateRaffle(id: string, payload: Record<string, unknown>): Promise<Raffle> {
  const { data } = await client.put<Raffle>(`/raffles/${id}`, payload);
  return data;
}

export async function activateRaffle(id: string): Promise<Raffle> {
  const { data } = await client.post<Raffle>(`/raffles/${id}/activate`);
  return data;
}

export async function finalizeRaffle(id: string): Promise<Raffle> {
  const { data } = await client.post<Raffle>(`/raffles/${id}/finalize`);
  return data;
}
