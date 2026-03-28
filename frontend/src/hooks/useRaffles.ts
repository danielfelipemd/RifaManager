import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activateRaffle, createRaffle, finalizeRaffle, getRaffle, getRaffles } from "@/api/raffles";

export function useRaffles() {
  return useQuery({ queryKey: ["raffles"], queryFn: getRaffles });
}

export function useRaffle(id: string) {
  return useQuery({ queryKey: ["raffles", id], queryFn: () => getRaffle(id), enabled: !!id });
}

export function useCreateRaffle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRaffle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raffles"] }),
  });
}

export function useActivateRaffle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: activateRaffle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raffles"] }),
  });
}

export function useFinalizeRaffle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: finalizeRaffle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raffles"] }),
  });
}
