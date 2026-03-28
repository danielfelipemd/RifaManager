import client from "./client";
import type { TokenResponse } from "@/types";

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>("/auth/login", { email, password });
  return data;
}

export async function register(payload: {
  tenant_nombre: string;
  tenant_slug: string;
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
}): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>("/auth/register", payload);
  return data;
}

export async function getMe() {
  const { data } = await client.get("/auth/me");
  return data;
}
