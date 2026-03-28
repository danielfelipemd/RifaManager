import client from "./client";
import type { BuyerInfo, Purchase, Ticket, TicketSummary } from "@/types";

export async function getTickets(
  raffleId: string,
  params?: { estado?: string; page?: number; page_size?: number }
): Promise<Ticket[]> {
  const { data } = await client.get<Ticket[]>(`/raffles/${raffleId}/tickets`, { params });
  return data;
}

export async function getTicketsSummary(raffleId: string): Promise<TicketSummary> {
  const { data } = await client.get<TicketSummary>(`/raffles/${raffleId}/tickets/summary`);
  return data;
}

export async function reserveTicket(ticketId: string): Promise<Ticket> {
  const { data } = await client.post<Ticket>(`/tickets/${ticketId}/reserve`);
  return data;
}

export async function cancelReservation(ticketId: string): Promise<Ticket> {
  const { data } = await client.delete<Ticket>(`/tickets/${ticketId}/reserve`);
  return data;
}

export async function purchaseTicket(ticketId: string, buyer: BuyerInfo): Promise<Purchase> {
  const { data } = await client.post<Purchase>(`/tickets/${ticketId}/purchase`, buyer);
  return data;
}

export async function bulkPurchase(
  raffleId: string,
  ticketIds: string[],
  buyer: BuyerInfo
): Promise<Purchase[]> {
  const { data } = await client.post<Purchase[]>(`/raffles/${raffleId}/tickets/bulk-purchase`, {
    ticket_ids: ticketIds,
    buyer,
  });
  return data;
}
