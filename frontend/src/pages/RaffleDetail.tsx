import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRaffle, useActivateRaffle, useFinalizeRaffle } from "@/hooks/useRaffles";
import { checkWinner, type CheckWinnerResponse } from "@/api/lottery";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RAFFLE_STATES } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import { Trophy, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function RaffleDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: raffle, isLoading } = useRaffle(id!);
  const activateMutation = useActivateRaffle();
  const finalizeMutation = useFinalizeRaffle();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const queryClient = useQueryClient();

  const [winnerResult, setWinnerResult] = useState<CheckWinnerResponse | null>(null);

  const checkWinnerMutation = useMutation({
    mutationFn: () => checkWinner(id!),
    onSuccess: (data) => {
      setWinnerResult(data);
      queryClient.invalidateQueries({ queryKey: ["raffles", id] });
      if (data.hay_ganador) {
        toast.success(`HAY GANADOR! Numero ${data.ticket_ganador} - ${data.comprador_nombre}`);
      } else if (data.numero_ganador_loteria) {
        toast(`Numero de loteria: ${data.numero_ganador_loteria}. No hay ganador con boleta vendida.`, { icon: "🔍" });
      } else {
        toast("No se encontraron resultados de loteria para esta rifa", { icon: "⏳" });
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al verificar";
      toast.error(msg);
    },
  });

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{raffle.nombre}</h1>
          <span className={`${stateConfig.color} text-white text-xs px-2 py-1 rounded-full font-medium mt-2 inline-block`}>
            {stateConfig.label}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && raffle.loteria_asociada && (
            <button
              onClick={() => checkWinnerMutation.mutate()}
              disabled={checkWinnerMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
            >
              <Search size={16} />
              {checkWinnerMutation.isPending ? "Buscando..." : "Verificar Ganador"}
            </button>
          )}
          {isAdmin && raffle.estado === "borrador" && (
            <button onClick={handleActivate} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              Activar
            </button>
          )}
          {isAdmin && raffle.estado === "activa" && (
            <button onClick={handleFinalize} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Finalizar
            </button>
          )}
          <Link to={`/raffles/${raffle.id}/tickets`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Ver Boletas
          </Link>
        </div>
      </div>

      {/* Winner Result Card */}
      {(winnerResult || raffle.numero_ganador) && (
        <div className={`rounded-xl border-2 p-5 mb-6 ${
          winnerResult?.hay_ganador
            ? "bg-green-50 border-green-400"
            : "bg-gray-50 border-gray-300"
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <Trophy size={24} className={winnerResult?.hay_ganador ? "text-green-600" : "text-gray-400"} />
            <h3 className="text-lg font-bold text-gray-900">
              {winnerResult?.hay_ganador ? "HAY GANADOR!" : "Resultado de Loteria"}
            </h3>
          </div>

          {winnerResult ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Loteria:</span>{" "}
                  <span className="font-medium">{winnerResult.loteria_asociada}</span>
                </div>
                {winnerResult.fecha_resultado && (
                  <div>
                    <span className="text-gray-500">Fecha:</span>{" "}
                    <span className="font-medium">{winnerResult.fecha_resultado}</span>
                  </div>
                )}
              </div>

              {winnerResult.numero_ganador_loteria && (
                <div>
                  <span className="text-sm text-gray-500">Numero loteria:</span>
                  <div className="flex items-center gap-1 mt-1">
                    {winnerResult.numero_ganador_loteria.split("").map((d, i) => (
                      <span key={i} className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                        {d}
                      </span>
                    ))}
                    {winnerResult.serie_loteria && (
                      <>
                        <span className="text-xs text-gray-400 mx-2">Serie</span>
                        {winnerResult.serie_loteria.split("").map((d, i) => (
                          <span key={`s${i}`} className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-bold">
                            {d}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-500">Numero ganador (ultimos {raffle.numero_digitos} digitos):</span>
                <div className="flex items-center gap-1 mt-1">
                  {winnerResult.ticket_ganador?.split("").map((d, i) => (
                    <span key={i} className="w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center text-lg font-bold">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {winnerResult.hay_ganador && (
                <div className="mt-3 pt-3 border-t border-green-200 bg-green-100 rounded-lg p-3">
                  <p className="text-green-800 font-bold text-lg">
                    Ganador: {winnerResult.comprador_nombre}
                  </p>
                  {winnerResult.comprador_telefono && (
                    <p className="text-green-700 text-sm">Tel: {winnerResult.comprador_telefono}</p>
                  )}
                  {winnerResult.comprador_email && (
                    <p className="text-green-700 text-sm">Email: {winnerResult.comprador_email}</p>
                  )}
                </div>
              )}

              {!winnerResult.hay_ganador && winnerResult.numero_ganador_loteria && (
                <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                  <p className="text-gray-600 text-sm">
                    {winnerResult.ticket_estado === "vendido"
                      ? "El numero ganador fue vendido pero no hay coincidencia."
                      : `El numero ${winnerResult.ticket_ganador} no fue vendido. No hay ganador.`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Numero ganador registrado: <span className="font-bold text-lg">{raffle.numero_ganador}</span>
            </p>
          )}
        </div>
      )}

      {/* Stats Cards */}
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

      {/* Sales Progress */}
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progreso de Ventas</h3>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
          <div className="bg-indigo-600 h-4 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
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

      {/* Details */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalles</h3>
        <dl className="space-y-2 text-sm">
          {raffle.loteria_asociada && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Loteria asociada</dt>
              <dd className="font-medium">{raffle.loteria_asociada}</dd>
            </div>
          )}
          {raffle.fecha_sorteo && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha sorteo</dt>
              <dd className="font-medium">{formatDate(raffle.fecha_sorteo)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Digitos</dt>
            <dd className="font-medium">{raffle.numero_digitos}</dd>
          </div>
          {raffle.descripcion && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Descripcion</dt>
              <dd className="font-medium">{raffle.descripcion}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Creada</dt>
            <dd className="font-medium">{formatDate(raffle.created_at)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
