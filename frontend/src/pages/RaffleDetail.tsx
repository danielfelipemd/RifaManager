import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRaffle, useFinalizeRaffle } from "@/hooks/useRaffles";
import { checkWinner, type CheckWinnerResponse } from "@/api/lottery";
import { getCommissionPreview, getConfig, createPaymentRequest, getMyPaymentRequests } from "@/api/admin";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RAFFLE_STATES } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";
import { Trophy, Search, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

export default function RaffleDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: raffle, isLoading } = useRaffle(id!);
  const finalizeMutation = useFinalizeRaffle();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const queryClient = useQueryClient();

  const [winnerResult, setWinnerResult] = useState<CheckWinnerResponse | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Check existing payment requests for this raffle
  const { data: myPayments } = useQuery({
    queryKey: ["my-payments"],
    queryFn: getMyPaymentRequests,
    enabled: isAdmin,
  });

  const existingPayment = myPayments?.find((p) => p.raffle_id === id);

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
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error";
      toast.error(msg);
    },
  });

  if (isLoading || !raffle) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  const stateConfig = RAFFLE_STATES[raffle.estado];
  const totalTickets = raffle.tickets_disponibles + raffle.tickets_reservados + raffle.tickets_vendidos;
  const progressPercent = totalTickets > 0 ? (raffle.tickets_vendidos / totalTickets) * 100 : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{raffle.nombre}</h1>
          <span className={`${stateConfig.color} text-white text-xs px-2 py-1 rounded-full font-medium mt-2 inline-block`}>{stateConfig.label}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && raffle.loteria_asociada && raffle.estado === "activa" && (
            <button onClick={() => checkWinnerMutation.mutate()} disabled={checkWinnerMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50">
              <Search size={16} />{checkWinnerMutation.isPending ? "Buscando..." : "Verificar Ganador"}
            </button>
          )}
          {isAdmin && raffle.estado === "borrador" && !existingPayment && (
            <button onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <CreditCard size={16} />Solicitar Activacion
            </button>
          )}
          {isAdmin && raffle.estado === "activa" && (
            <button onClick={async () => { await finalizeMutation.mutateAsync(raffle.id); toast.success("Rifa finalizada"); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Finalizar</button>
          )}
          <Link to={`/raffles/${raffle.id}/tickets`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Ver Boletas</Link>
        </div>
      </div>

      {/* Payment Status Banner */}
      {existingPayment && raffle.estado === "borrador" && (
        <div className={`rounded-xl border-2 p-4 mb-6 ${
          existingPayment.estado === "pendiente" ? "bg-yellow-50 border-yellow-300" :
          existingPayment.estado === "aprobado" ? "bg-green-50 border-green-300" :
          "bg-red-50 border-red-300"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={18} className={
              existingPayment.estado === "pendiente" ? "text-yellow-600" :
              existingPayment.estado === "aprobado" ? "text-green-600" : "text-red-600"
            } />
            <span className="font-semibold text-gray-900">
              Pago de activacion: {existingPayment.estado === "pendiente" ? "Pendiente de aprobacion" :
                existingPayment.estado === "aprobado" ? "Aprobado" : "Rechazado"}
            </span>
          </div>
          <p className="text-sm text-gray-600">Monto: {formatCurrency(existingPayment.monto)} | Ref: {existingPayment.comprobante_ref || "Sin ref"}</p>
          {existingPayment.notas_admin && <p className="text-sm text-gray-500 mt-1">Admin: {existingPayment.notas_admin}</p>}
        </div>
      )}

      {/* Winner Card */}
      {(winnerResult || raffle.numero_ganador) && (
        <div className={`rounded-xl border-2 p-5 mb-6 ${winnerResult?.hay_ganador ? "bg-green-50 border-green-400" : "bg-gray-50 border-gray-300"}`}>
          <div className="flex items-center gap-3 mb-3">
            <Trophy size={24} className={winnerResult?.hay_ganador ? "text-green-600" : "text-gray-400"} />
            <h3 className="text-lg font-bold text-gray-900">{winnerResult?.hay_ganador ? "HAY GANADOR!" : "Resultado de Loteria"}</h3>
          </div>
          {winnerResult ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-4 text-sm">
                <span><span className="text-gray-500">Loteria:</span> <span className="font-medium">{winnerResult.loteria_asociada}</span></span>
                {winnerResult.fecha_resultado && <span><span className="text-gray-500">Fecha:</span> <span className="font-medium">{winnerResult.fecha_resultado}</span></span>}
              </div>
              {winnerResult.numero_ganador_loteria && (
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-gray-500 mr-1">Numero:</span>
                  {winnerResult.numero_ganador_loteria.split("").map((d, i) => (
                    <span key={i} className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">{d}</span>
                  ))}
                </div>
              )}
              {winnerResult.hay_ganador && (
                <div className="mt-3 bg-green-100 rounded-lg p-3">
                  <p className="text-green-800 font-bold text-lg">Ganador: {winnerResult.comprador_nombre}</p>
                  {winnerResult.comprador_telefono && <p className="text-green-700 text-sm">Tel: {winnerResult.comprador_telefono}</p>}
                  {winnerResult.comprador_email && <p className="text-green-700 text-sm">Email: {winnerResult.comprador_email}</p>}
                </div>
              )}
              {!winnerResult.hay_ganador && winnerResult.numero_ganador_loteria && (
                <p className="text-sm text-gray-500 mt-2 p-3 bg-gray-100 rounded-lg">Numero {winnerResult.ticket_ganador} no fue vendido. Sin ganador.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Numero ganador: <span className="font-bold text-lg">{raffle.numero_ganador}</span></p>
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
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(raffle.precio_boleta * raffle.cantidad_numeros)}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progreso de Ventas</h3>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
          <div className="bg-indigo-600 h-4 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold text-green-600">{raffle.tickets_disponibles}</p><p className="text-sm text-gray-500">Disponibles</p></div>
          <div><p className="text-2xl font-bold text-yellow-600">{raffle.tickets_reservados}</p><p className="text-sm text-gray-500">Reservados</p></div>
          <div><p className="text-2xl font-bold text-red-600">{raffle.tickets_vendidos}</p><p className="text-sm text-gray-500">Vendidos</p></div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Detalles</h3>
        <dl className="space-y-2 text-sm">
          {raffle.loteria_asociada && <div className="flex justify-between"><dt className="text-gray-500">Loteria</dt><dd className="font-medium">{raffle.loteria_asociada}</dd></div>}
          {raffle.fecha_sorteo && <div className="flex justify-between"><dt className="text-gray-500">Fecha sorteo</dt><dd className="font-medium">{formatDate(raffle.fecha_sorteo)}</dd></div>}
          <div className="flex justify-between"><dt className="text-gray-500">Digitos</dt><dd className="font-medium">{raffle.numero_digitos}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Creada</dt><dd className="font-medium">{formatDate(raffle.created_at)}</dd></div>
        </dl>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal raffleId={raffle.id} valorTotal={raffle.precio_boleta * raffle.cantidad_numeros}
          onClose={() => setShowPaymentModal(false)}
          onCreated={() => { setShowPaymentModal(false); queryClient.invalidateQueries({ queryKey: ["my-payments"] }); }}
        />
      )}
    </div>
  );
}

function PaymentModal({ raffleId, valorTotal, onClose, onCreated }: {
  raffleId: string; valorTotal: number; onClose: () => void; onCreated: () => void;
}) {
  const [ref, setRef] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: preview } = useQuery({
    queryKey: ["commission-preview", valorTotal],
    queryFn: () => getCommissionPreview(valorTotal),
  });

  const { data: nequiConfig } = useQuery({
    queryKey: ["config-nequi"],
    queryFn: () => getConfig("nequi_numero"),
  });

  const { data: nequiTitular } = useQuery({
    queryKey: ["config-nequi-titular"],
    queryFn: () => getConfig("nequi_titular"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createPaymentRequest(raffleId, ref || undefined, notas || undefined);
      toast.success("Solicitud de pago enviada. El admin la revisara.");
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Solicitar Activacion de Rifa</h2>

        {/* Commission info */}
        <div className="bg-indigo-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600">Valor total de la rifa: <span className="font-bold">{formatCurrency(valorTotal)}</span></p>
          <p className="text-sm text-gray-600">Comision plataforma ({((preview?.porcentaje ?? 0) * 100).toFixed(0)}%):
            <span className="font-bold text-indigo-700 text-lg ml-1">{formatCurrency(preview?.comision ?? 0)}</span>
          </p>
        </div>

        {/* Nequi info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-green-800 mb-1">Consignar a Nequi:</p>
          <p className="text-2xl font-bold text-green-700">{nequiConfig?.valor || "Cargando..."}</p>
          <p className="text-sm text-green-600">Titular: {nequiTitular?.valor || "..."}</p>
          <p className="text-sm text-green-600 mt-1">Monto: {formatCurrency(preview?.comision ?? 0)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia de pago / comprobante</label>
            <input value={ref} onChange={(e) => setRef(e.target.value)}
              placeholder="Ej: Nequi ref #123456"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <input value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Informacion adicional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
              {loading ? "Enviando..." : "Enviar Solicitud de Pago"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
