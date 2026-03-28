import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/client";
import { getAllConfig, updateConfig, type PlatformConfig } from "@/api/admin";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/lib/utils";
import type { Tenant } from "@/types";
import toast from "react-hot-toast";

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";
  const [activeTab, setActiveTab] = useState<"org" | "platform">(isSuperAdmin ? "platform" : "org");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuracion</h1>

      {isSuperAdmin && (
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("platform")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "platform" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Plataforma
          </button>
          <button
            onClick={() => setActiveTab("org")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "org" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Organizacion
          </button>
        </div>
      )}

      {activeTab === "platform" && isSuperAdmin && <PlatformSettingsTab />}
      {activeTab === "org" && <OrgSettingsTab />}
    </div>
  );
}

function PlatformSettingsTab() {
  const queryClient = useQueryClient();
  const { data: configs, isLoading } = useQuery({
    queryKey: ["platform-config"],
    queryFn: getAllConfig,
  });

  const [comision, setComision] = useState("");
  const [nequiNumero, setNequiNumero] = useState("");
  const [nequiTitular, setNequiTitular] = useState("");
  const [previewMonto, setPreviewMonto] = useState(1000000);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (configs && !initialized) {
      const com = configs.find((c) => c.clave === "comision_porcentaje");
      const neq = configs.find((c) => c.clave === "nequi_numero");
      const tit = configs.find((c) => c.clave === "nequi_titular");
      if (com) setComision(com.valor);
      if (neq) setNequiNumero(neq.valor);
      if (tit) setNequiTitular(tit.valor);
      setInitialized(true);
    }
  }, [configs, initialized]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        updateConfig("comision_porcentaje", comision),
        updateConfig("nequi_numero", nequiNumero),
        updateConfig("nequi_titular", nequiTitular),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-config"] });
      toast.success("Configuracion guardada");
    },
    onError: () => toast.error("Error al guardar"),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  const porcentajeNum = parseFloat(comision) || 0;
  const ganancia = previewMonto * porcentajeNum;

  return (
    <div className="space-y-6">
      {/* Commission */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comision por Rifa</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje de comision</label>
            <select
              value={comision}
              onChange={(e) => setComision(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="0.01">1% (0.01)</option>
              <option value="0.02">2% (0.02)</option>
              <option value="0.03">3% (0.03)</option>
              <option value="0.04">4% (0.04)</option>
              <option value="0.05">5% (0.05)</option>
              <option value="0.06">6% (0.06)</option>
              <option value="0.07">7% (0.07)</option>
              <option value="0.08">8% (0.08)</option>
              <option value="0.09">9% (0.09)</option>
              <option value="0.10">10% (0.10)</option>
              <option value="0.15">15% (0.15)</option>
              <option value="0.20">20% (0.20)</option>
            </select>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Simulador de ganancia</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Valor total de la rifa ($)</label>
                <input
                  type="number"
                  value={previewMonto}
                  onChange={(e) => setPreviewMonto(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div className="text-center px-4">
                <p className="text-xs text-gray-500">Comision ({(porcentajeNum * 100).toFixed(0)}%)</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(ganancia)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nequi */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos de Nequi (Pagos)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numero de Nequi</label>
            <input
              value={nequiNumero}
              onChange={(e) => setNequiNumero(e.target.value)}
              placeholder="3001234567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titular de la cuenta</label>
            <input
              value={nequiTitular}
              onChange={(e) => setNequiTitular(e.target.value)}
              placeholder="Nombre del titular"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {saveMutation.isPending ? "Guardando..." : "Guardar Configuracion"}
      </button>
    </div>
  );
}

function OrgSettingsTab() {
  const queryClient = useQueryClient();
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant"],
    queryFn: async () => {
      const { data } = await client.get<Tenant>("/tenants/me");
      return data;
    },
  });

  const [nombre, setNombre] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (tenant && !initialized) {
    setNombre(tenant.nombre);
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: async (data: { nombre: string }) => {
      const { data: result } = await client.put<Tenant>("/tenants/me", data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Configuracion actualizada");
    },
    onError: () => toast.error("Error al actualizar"),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Organizacion</h3>
      <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ nombre }); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input value={tenant?.slug ?? ""} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
          <input value={tenant?.plan ?? ""} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
        </div>
        <button type="submit" disabled={updateMutation.isPending} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
          {updateMutation.isPending ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </div>
  );
}
