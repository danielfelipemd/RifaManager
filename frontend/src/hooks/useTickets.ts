import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkPurchase,
  cancelReservation,
  getTickets,
  getTicketsSummary,
  purchaseTicket,
  reserveTicket,
} from "@/api/tickets";
import type { BuyerInfo } from "@/types";

export function useTickets(raffleId: string, params?: { estado?: string; page?: number }) {
  return useQuery({
    queryKey: ["tickets", raffleId, params],
    queryFn: () => getTickets(raffleId, params),
    enabled: !!raffleId,
  });
}

export function useTicketsSummary(raffleId: string) {
  return useQuery({
    queryKey: ["tickets-summary", raffleId],
    queryFn: () => getTicketsSummary(raffleId),
    enabled: !!raffleId,
  });
}

export function useReserveTicket(raffleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reserveTicket,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets", raffleId] });
      qc.invalidateQueries({ queryKey: ["tickets-summary", raffleId] });
    },
  });
}

export function useCancelReservation(raffleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets", raffleId] });
      qc.invalidateQueries({ queryKey: ["tickets-summary", raffleId] });
    },
  });
}

export function usePurchaseTicket(raffleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, buyer }: { ticketId: string; buyer: BuyerInfo }) =>
      purchaseTicket(ticketId, buyer),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets", raffleId] });
      qc.invalidateQueries({ queryKey: ["tickets-summary", raffleId] });
      qc.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
}

export function useBulkPurchase(raffleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketIds, buyer }: { ticketIds: string[]; buyer: BuyerInfo }) =>
      bulkPurchase(raffleId, ticketIds, buyer),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets", raffleId] });
      qc.invalidateQueries({ queryKey: ["tickets-summary", raffleId] });
      qc.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
}
