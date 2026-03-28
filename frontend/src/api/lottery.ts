import client from "./client";

export interface LotteryProvider {
  id: string;
  nombre: string;
  slug: string;
  url_oficial: string | null;
  activo: boolean;
  dia_sorteo: string | null;
  created_at: string;
}

export interface LotteryResult {
  id: string;
  loteria: string;
  numero: string;
  fecha: string;
  serie: string | null;
  raw_data: Record<string, string> | null;
  created_at: string;
}

export interface ScrapedResult {
  loteria: string;
  numero: string;
  serie: string | null;
  fecha: string;
  sorteo: string | null;
  premio_mayor: string | null;
}

export interface CheckWinnerResponse {
  raffle_id: string;
  raffle_nombre: string;
  loteria_asociada: string;
  numero_ganador_loteria: string | null;
  serie_loteria: string | null;
  fecha_resultado: string | null;
  hay_ganador: boolean;
  ticket_ganador: string | null;
  comprador_nombre: string | null;
}

export async function getProviders(): Promise<LotteryProvider[]> {
  const { data } = await client.get<LotteryProvider[]>("/lottery/providers");
  return data;
}

export async function createProvider(payload: {
  nombre: string;
  slug: string;
  url_oficial?: string;
  dia_sorteo?: string;
}): Promise<LotteryProvider> {
  const { data } = await client.post<LotteryProvider>("/lottery/providers", payload);
  return data;
}

export async function deleteProvider(id: string): Promise<void> {
  await client.delete(`/lottery/providers/${id}`);
}

export async function fetchResults(): Promise<LotteryResult[]> {
  const { data } = await client.post<LotteryResult[]>("/lottery/fetch");
  return data;
}

export async function previewScrape(): Promise<ScrapedResult[]> {
  const { data } = await client.get<ScrapedResult[]>("/lottery/scrape-preview");
  return data;
}

export async function getResults(loteria?: string): Promise<LotteryResult[]> {
  const { data } = await client.get<LotteryResult[]>("/lottery/results", {
    params: loteria ? { loteria } : undefined,
  });
  return data;
}

export async function checkWinner(raffleId: string): Promise<CheckWinnerResponse> {
  const { data } = await client.post<CheckWinnerResponse>(`/lottery/check/${raffleId}`);
  return data;
}
