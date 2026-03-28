import { useParams, Link } from "react-router-dom";
import { useRaffle, useActivateRaffle, useFinalizeRaffle } from "@/hooks/useRaffles";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RAFFLE_STATES } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

export default function RaffleDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: raffle, isLoading } = useRaffle(id!);
  const activateMutation = useActivateRaffle();
  const finalizeMutation = useFinalizeRaffle();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (isLoading || !raffle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const stateConfig = RAFFLE_STATES[raffle.estado];
  const totalTickets = raffle.tickets_disponibles + raffle.tickets_reservados + raffle.tickets_vendidos;
  const progressPercent = totalTickets > 0 ? (raffle.tickets_vendidos / totalTickets) * 100 : 0;

  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync(raffle.id);
      toast.success("Rifa activada");
    } catch {
      toast.error("Error al activar");
    }
  };

  const handleFinalize = async () => {
    try {
      await finalizeMutation.mutateAsync(raffle.id);
      toast.success("Rifa finalizada");
    } catch {
      toast.error("Error al finalizar");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{raffle.nombre}</h1>
          <span className={`${stateConfig.color} text-white text-xs px-2 py-1 rounded-full font-medium mt-2 inline-block`}>
            {stateConfig.label}
          </span>
        </div>
        <div className="flex gap-2">
          {isAdmin && raffle.estado === "borrador" && (
            <button
              onClick={handleActivate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Activar
            </button>
          )}
          {isAdmin && raffle.estado === "activa" && (
            <button
              onClick={handleFinalize}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Finalizar
            </button>
          )}
          <Link
            to={`/raffles/${raffle.id}/tickets`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Ver Boletas
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">Precio Boleta</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(raffle.precio_boleta)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">Total Numeros</p>
          <p className="text-2xl font-bold text-gray-900">{raffle.cantidad_numeros}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500">Ingresos Potenciales</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(raffle.precio_boleta * raffle.cantidad_numeros)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progreso de Ventas</h3>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
          <div
            className="bg-indigo-600 h-4 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{raffle.tickets_disponibles}</p>
            <p className="text-sm text-gray-500">Disponibles</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{raffle.tickets_reservados}</p>
            <p className="text-sm text-gray-500">Reservados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{raffle.tickets_vendidos}</p>
            <p className="text-sm text-gray-500">Vendidos</p>
          </div>
        </div>
      </div>

      {raffle.descripcion && (
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripcion</h3>
          <p className="text-gray-600">{raffle.descripcion}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalles</h3>
        <dl className="space-y-2 text-sm">
          {raffle.fecha_sorteo && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha sorteo</dt>
              <dd className="font-medium">{formatDate(raffle.fecha_sorteo)}</dd>
            </div>
          )}
          {raffle.loteria_asociada && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Loteria</dt>
              <dd className="font-medium">{raffle.loteria_asociada}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Digitos</dt>
            <dd className="font-medium">{raffle.numero_digitos}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Creada</dt>
            <dd className="font-medium">{formatDate(raffle.created_at)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
