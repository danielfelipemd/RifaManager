import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProvider,
  deleteProvider,
  fetchResults,
  getProviders,
  getResults,
  previewScrape,
  type LotteryProvider,
  type ScrapedResult,
} from "@/api/lottery";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils";
import { Download, Plus, RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function LotteryResults() {
  const [activeTab, setActiveTab] = useState<"results" | "providers" | "scrape">("results");
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Loterias</h1>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("results")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "results"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Resultados
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab("scrape")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "scrape"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Consultar Hoy
            </button>
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
          </>
        )}
      </div>

      {activeTab === "results" && <ResultsTab />}
      {activeTab === "scrape" && <ScrapeTab />}
      {activeTab === "providers" && <ProvidersTab />}
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
        <p className="text-gray-500">No hay resultados almacenados. Usa "Consultar Hoy" para obtener resultados.</p>
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
                {r.serie.split("").map((d, i) => (
                  <span key={`s${i}`} className="w-7 h-7 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-bold">
                    {d}
                  </span>
                ))}
              </>
            )}
          </div>
          {r.raw_data?.sorteo && (
            <p className="text-xs text-gray-400">Sorteo: {r.raw_data.sorteo}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ScrapeTab() {
  const queryClient = useQueryClient();
  const [scraped, setScraped] = useState<ScrapedResult[]>([]);

  const previewMutation = useMutation({
    mutationFn: previewScrape,
    onSuccess: (data) => {
      setScraped(data);
      toast.success(`${data.length} resultados encontrados`);
    },
    onError: () => toast.error("Error al consultar resultados"),
  });

  const storeMutation = useMutation({
    mutationFn: fetchResults,
    onSuccess: (data) => {
      toast.success(`${data.length} resultados nuevos guardados`);
      queryClient.invalidateQueries({ queryKey: ["lottery-results"] });
    },
    onError: () => toast.error("Error al guardar resultados"),
  });

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => previewMutation.mutate()}
          disabled={previewMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
        >
          <RefreshCw size={16} className={previewMutation.isPending ? "animate-spin" : ""} />
          {previewMutation.isPending ? "Consultando..." : "Consultar Resultados"}
        </button>
        {scraped.length > 0 && (
          <button
            onClick={() => storeMutation.mutate()}
            disabled={storeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            <Download size={16} />
            {storeMutation.isPending ? "Guardando..." : "Guardar en Sistema"}
          </button>
        )}
      </div>

      {scraped.length > 0 && (
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
                    {r.serie.split("").map((d, i) => (
                      <span key={`s${i}`} className="w-7 h-7 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-bold">
                        {d}
                      </span>
                    ))}
                  </>
                )}
              </div>
              <div className="text-xs text-gray-400 space-y-0.5">
                {r.sorteo && <p>Sorteo: {r.sorteo}</p>}
                {r.premio_mayor && <p>{r.premio_mayor}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">URL</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {providers?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{p.dia_sorteo || "-"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-48">
                  {p.url_oficial ? (
                    <a href={p.url_oficial} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      {p.url_oficial}
                    </a>
                  ) : "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {p.activo ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteMutation.mutate(p.id)}
                    className="text-red-500 hover:text-red-700"
                  >
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
          <input
            name="nombre"
            placeholder="Nombre (ej: Loteria del Tolima)"
            value={form.nombre}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <input
            name="slug"
            placeholder="Slug (auto-generado)"
            value={form.slug}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <input
            name="url_oficial"
            placeholder="URL oficial (opcional)"
            value={form.url_oficial}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <input
            name="dia_sorteo"
            placeholder="Dia de sorteo (ej: Lunes)"
            value={form.dia_sorteo}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
              Crear
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
