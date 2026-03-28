import client from "./client";
import type { DashboardMetrics } from "@/types";

export async function getMetrics(): Promise<DashboardMetrics> {
  const { data } = await client.get<DashboardMetrics>("/dashboard/metrics");
  return data;
}

export async function getRaffleMetrics(raffleId: string) {
  const { data } = await client.get(`/dashboard/metrics/${raffleId}`);
  return data;
}
