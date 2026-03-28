import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useRaffles } from "@/hooks/useRaffles";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RAFFLE_STATES } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";

export default function RaffleList() {
  const { data: raffles, isLoading } = useRaffles();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rifas</h1>
        {isAdmin && (
          <Link
            to="/raffles/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Nueva Rifa
          </Link>
        )}
      </div>

      {!raffles?.length ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <p className="text-gray-500">No hay rifas creadas aun</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {raffles.map((raffle) => {
            const stateConfig = RAFFLE_STATES[raffle.estado];
            return (
              <Link
                key={raffle.id}
                to={`/raffles/${raffle.id}`}
                className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                    {raffle.nombre}
                  </h3>
                  <span
                    className={`${stateConfig.color} text-white text-xs px-2 py-1 rounded-full font-medium`}
                  >
                    {stateConfig.label}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Numeros:</span>
                    <span className="font-medium">{raffle.cantidad_numeros}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Precio boleta:</span>
                    <span className="font-medium">{formatCurrency(raffle.precio_boleta)}</span>
                  </div>
                  {raffle.fecha_sorteo && (
                    <div className="flex justify-between">
                      <span>Sorteo:</span>
                      <span className="font-medium">{formatDate(raffle.fecha_sorteo)}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
