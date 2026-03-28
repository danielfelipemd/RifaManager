import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProvider,
  deleteProvider,
  fetchAndCheckWinners,
  fetchResults,
  getProviders,
  getResults,
  previewScrape,
  type CheckWinnerResponse,
  type ScrapedResult,
} from "@/api/lottery";
import { useAuthStore } from "@/stores/authStore";
import { Download, Plus, RefreshCw, Search, Trash2, Trophy } from "lucide-react";
import toast from "react-hot-toast";

export default function LotteryResults() {
  const [activeTab, setActiveTab] = useState<"check" | "results" | "providers">("check");
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Loterias</h1>

      <div className="flex gap-2 mb-6 border-b">
        {isAdmin && (
          <button
            onClick={() => setActiveTab("check")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "check"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Consultar y Verificar
          </button>
        )}
        <button
          onClick={() => setActiveTab("results")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "results"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Resultados Guardados
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("providers")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "providers"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Gestionar Loterias
          </button>
        )}
      </div>

      {activeTab === "check" && <CheckWinnersTab />}
      {activeTab === "results" && <ResultsTab />}
      {activeTab === "providers" && <ProvidersTab />}
    </div>
  );
}

function CheckWinnersTab() {
  const queryClient = useQueryClient();
  const [winnerResults, setWinnerResults] = useState<CheckWinnerResponse[]>([]);
  const [scraped, setScraped] = useState<ScrapedResult[]>([]);

  const previewMutation = useMutation({
    mutationFn: previewScrape,
    onSuccess: (data) => {
      setScraped(data);
      toast.success(`${data.length} resultados de loteria encontrados`);
    },
    onError: () => toast.error("Error al consultar resultados"),
  });

  const checkMutation = useMutation({
    mutationFn: fetchAndCheckWinners,
    onSuccess: (data) => {
      setWinnerResults(data);
      queryClient.invalidateQueries({ queryKey: ["lottery-results"] });
      queryClient.invalidateQueries({ queryKey: ["raffles"] });
      const winners = data.filter((r) => r.hay_ganador);
      if (winners.length > 0) {
        toast.success(`${winners.length} RIFA(S) CON GANADOR!`);
      } else if (data.length > 0) {
        toast(`${data.length} rifas verificadas. Sin ganadores.`, { icon: "🔍" });
      } else {
        toast("No hay rifas activas con loteria asociada", { icon: "⚠️" });
      }
    },
    onError: () => toast.error("Error al verificar ganadores"),
  });

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Consultar Resultados y Verificar Ganadores</h2>
        <p className="text-sm text-gray-500 mb-4">
          Este proceso consulta los resultados mas recientes de las loterias colombianas, los guarda en el sistema,
          y automaticamente verifica todas las rifas activas para determinar si hay ganadores.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => previewMutation.mutate()}
            disabled={previewMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw size={16} className={previewMutation.isPending ? "animate-spin" : ""} />
            {previewMutation.isPending ? "Consultando..." : "Solo Ver Resultados"}
          </button>
          <button
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-bold"
          >
            <Search size={16} className={checkMutation.isPending ? "animate-spin" : ""} />
            {checkMutation.isPending ? "Verificando..." : "Consultar y Verificar Ganadores"}
          </button>
        </div>
      </div>

      {/* Winner Results */}
      {winnerResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Resultado de Verificacion</h3>
          <div className="space-y-3">
            {winnerResults.map((r) => (
              <div
                key={r.raffle_id}
                className={`rounded-xl border-2 p-4 ${
                  r.hay_ganador ? "bg-green-50 border-green-400" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Trophy size={20} className={r.hay_ganador ? "text-green-600" : "text-gray-300"} />
                  <span className="font-semibold text-gray-900">{r.raffle_nombre}</span>
                  <span className="text-xs text-gray-400">({r.loteria_asociada})</span>
                </div>

                {r.numero_ganador_loteria ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 mr-1">Loteria:</span>
                      {r.numero_ganador_loteria.split("").map((d, i) => (
                        <span key={i} className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          {d}
                        </span>
                      ))}
                      <span className="text-xs text-gray-500 mx-2">Boleta:</span>
                      {r.ticket_ganador?.split("").map((d, i) => (
                        <span key={`t${i}`} className="w-7 h-7 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">
                          {d}
                        </span>
                      ))}
                    </div>

                    {r.hay_ganador ? (
                      <div className="bg-green-100 rounded-lg p-3">
                        <p className="text-green-800 font-bold">GANADOR: {r.comprador_nombre}</p>
                        {r.comprador_telefono && <p className="text-green-700 text-sm">Tel: {r.comprador_telefono}</p>}
                        {r.comprador_email && <p className="text-green-700 text-sm">Email: {r.comprador_email}</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Numero {r.ticket_ganador} no fue vendido. Sin ganador.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No hay resultados de loteria disponibles aun.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scraped Preview */}
      {scraped.length > 0 && winnerResults.length === 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Resultados de Hoy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scraped.map((r, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{r.loteria}</h3>
                <p className="text-xs text-gray-500 mb-3">{r.fecha}</p>
                <div className="flex items-center gap-1 mb-2">
                  {r.numero.split("").map((d, i) => (
                    <span key={i} className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                      {d}
                    </span>
                  ))}
                  {r.serie && (
                    <>
                      <span className="text-xs text-gray-400 mx-1">Serie</span>
                      {r.serie?.split("").map((d, i) => (
                        <span key={`s${i}`} className="w-7 h-7 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-bold">
                          {d}
                        </span>
                      ))}
                    </>
                  )}
                </div>
                {r.sorteo && <p className="text-xs text-gray-400">Sorteo: {r.sorteo}</p>}
                {r.premio_mayor && <p className="text-xs text-gray-400">{r.premio_mayor}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsTab() {
  const { data: results, isLoading } = useQuery({
    queryKey: ["lottery-results"],
    queryFn: () => getResults(),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  if (!results?.length) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border">
        <p className="text-gray-500">No hay resultados almacenados. Usa "Consultar y Verificar" para obtener resultados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((r) => (
        <div key={r.id} className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="font-semibold text-gray-900 mb-1">{r.loteria}</h3>
          <p className="text-xs text-gray-500 mb-3">{r.fecha}</p>
          <div className="flex items-center gap-1 mb-2">
            {r.numero.split("").map((d, i) => (
              <span key={i} className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                {d}
              </span>
            ))}
            {r.serie && (
              <>
                <span className="text-xs text-gray-400 mx-1">Serie</span>
                {r.serie?.split("").map((d, i) => (
                  <span key={`s${i}`} className="w-7 h-7 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-bold">
                    {d}
                  </span>
                ))}
              </>
            )}
          </div>
          {r.raw_data?.sorteo && <p className="text-xs text-gray-400">Sorteo: {r.raw_data.sorteo}</p>}
        </div>
      ))}
    </div>
  );
}

function ProvidersTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: providers, isLoading } = useQuery({
    queryKey: ["lottery-providers"],
    queryFn: getProviders,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lottery-providers"] });
      toast.success("Loteria eliminada");
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          Nueva Loteria
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Dia Sorteo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {providers?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{p.dia_sorteo || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {p.activo ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteMutation.mutate(p.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateProviderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["lottery-providers"] });
          }}
        />
      )}
    </div>
  );
}

function CreateProviderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ nombre: "", slug: "", url_oficial: "", dia_sorteo: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (name === "nombre") {
      setForm((p) => ({
        ...p,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProvider({
        nombre: form.nombre,
        slug: form.slug,
        url_oficial: form.url_oficial || undefined,
        dia_sorteo: form.dia_sorteo || undefined,
      });
      toast.success("Loteria creada");
      onCreated();
    } catch {
      toast.error("Error al crear loteria");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Nueva Loteria</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="nombre" placeholder="Nombre (ej: Loteria del Tolima)" value={form.nombre} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          <input name="slug" placeholder="Slug (auto-generado)" value={form.slug} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          <input name="url_oficial" placeholder="URL oficial (opcional)" value={form.url_oficial} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          <input name="dia_sorteo" placeholder="Dia de sorteo (ej: Lunes)" value={form.dia_sorteo} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Crear</button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
