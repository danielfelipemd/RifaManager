import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCreateRaffle } from "@/hooks/useRaffles";
import { getProviders } from "@/api/lottery";
import toast from "react-hot-toast";

export default function RaffleCreate() {
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    cantidad_numeros: 100,
    numero_digitos: 2,
    precio_boleta: 5000,
    fecha_sorteo: "",
    loteria_asociada: "",
  });
  const createRaffle = useCreateRaffle();
  const navigate = useNavigate();

  const { data: providers } = useQuery({
    queryKey: ["lottery-providers"],
    queryFn: getProviders,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ["cantidad_numeros", "numero_digitos", "precio_boleta"].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const raffle = await createRaffle.mutateAsync({
        ...form,
        fecha_sorteo: form.fecha_sorteo || undefined,
        loteria_asociada: form.loteria_asociada || undefined,
        descripcion: form.descripcion || undefined,
      });
      toast.success(`Rifa "${raffle.nombre}" creada con ${form.cantidad_numeros} numeros`);
      navigate(`/raffles/${raffle.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al crear rifa";
      toast.error(msg);
    }
  };

  const activeProviders = providers?.filter((p) => p.activo) ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nueva Rifa</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la rifa</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Rifa del carro 2025"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Descripcion opcional..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de numeros</label>
            <input
              name="cantidad_numeros"
              type="number"
              min={1}
              value={form.cantidad_numeros}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Digitos por numero</label>
            <select
              name="numero_digitos"
              value={form.numero_digitos}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value={2}>2 digitos (00-99)</option>
              <option value={3}>3 digitos (000-999)</option>
              <option value={4}>4 digitos (0000-9999)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio por boleta ($)</label>
            <input
              name="precio_boleta"
              type="number"
              min={1}
              value={form.precio_boleta}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del sorteo</label>
            <input
              name="fecha_sorteo"
              type="datetime-local"
              value={form.fecha_sorteo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Loteria asociada</label>
          <select
            name="loteria_asociada"
            value={form.loteria_asociada}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">-- Seleccionar loteria --</option>
            {activeProviders.map((p) => (
              <option key={p.id} value={p.nombre}>
                {p.nombre} {p.dia_sorteo ? `(${p.dia_sorteo})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createRaffle.isPending}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {createRaffle.isPending ? "Creando..." : "Crear Rifa"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/raffles")}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
