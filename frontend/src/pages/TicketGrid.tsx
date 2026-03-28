import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTickets } from "@/api/tickets";
import { getRaffle } from "@/api/raffles";
import { useBulkPurchase, useTicketsSummary } from "@/hooks/useTickets";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { BuyerInfo, Ticket } from "@/types";
import toast from "react-hot-toast";

export default function TicketGrid() {
  const { id: raffleId } = useParams<{ id: string }>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const queryClient = useQueryClient();

  const { data: raffle } = useQuery({
    queryKey: ["raffles", raffleId],
    queryFn: () => getRaffle(raffleId!),
    enabled: !!raffleId,
  });

  // Load all tickets (paginated in batches)
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets", raffleId, "all"],
    queryFn: async () => {
      const allTickets: Ticket[] = [];
      let page = 1;
      const pageSize = 500;
      let hasMore = true;
      while (hasMore) {
        const batch = await getTickets(raffleId!, { page, page_size: pageSize });
        allTickets.push(...batch);
        hasMore = batch.length === pageSize;
        page++;
      }
      return allTickets;
    },
    enabled: !!raffleId,
  });

  const { data: summary } = useTicketsSummary(raffleId!);

  const bulkPurchase = useBulkPurchase(raffleId!);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t) => {
      if (searchQuery && !t.numero.includes(searchQuery)) return false;
      if (filterEstado !== "todos" && t.estado !== filterEstado) return false;
      return true;
    });
  }, [tickets, searchQuery, filterEstado]);

  const toggleSelect = (ticket: Ticket) => {
    if (ticket.estado === "vendido") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticket.id)) {
        next.delete(ticket.id);
      } else {
        next.add(ticket.id);
      }
      return next;
    });
  };

  const totalSelected = selectedIds.size;
  const totalCost = totalSelected * (raffle?.precio_boleta ?? 0);

  const handlePurchase = async (buyer: BuyerInfo) => {
    try {
      await bulkPurchase.mutateAsync({
        ticketIds: Array.from(selectedIds),
        buyer,
      });
      toast.success(`${totalSelected} boletas compradas exitosamente!`);
      setSelectedIds(new Set());
      setShowPurchaseModal(false);
      queryClient.invalidateQueries({ queryKey: ["tickets", raffleId] });
      queryClient.invalidateQueries({ queryKey: ["tickets-summary", raffleId] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Error al comprar";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{raffle?.nombre} - Boletas</h1>
        {summary && (
          <div className="flex gap-3 text-sm">
            <span className="text-green-600 font-medium">{summary.disponibles} disponibles</span>
            <span className="text-yellow-600 font-medium">{summary.reservados} reservados</span>
            <span className="text-red-600 font-medium">{summary.vendidos} vendidos</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar numero..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
        />
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
        >
          <option value="todos">Todos</option>
          <option value="disponible">Disponibles</option>
          <option value="reservado">Reservados</option>
          <option value="vendido">Vendidos</option>
        </select>
        {totalSelected > 0 && (
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Limpiar seleccion ({totalSelected})
          </button>
        )}
      </div>

      {/* Ticket Grid */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-1.5">
          {filteredTickets.map((ticket) => {
            const isSelected = selectedIds.has(ticket.id);
            return (
              <button
                key={ticket.id}
                onClick={() => toggleSelect(ticket)}
                disabled={ticket.estado === "vendido"}
                title={
                  ticket.estado === "vendido"
                    ? `Vendido a: ${ticket.vendido_a_nombre}`
                    : ticket.estado === "reservado"
                    ? "Reservado"
                    : "Disponible - click para seleccionar"
                }
                className={cn(
                  "aspect-square flex items-center justify-center rounded-md text-xs font-bold transition-all border-2",
                  ticket.estado === "disponible" && !isSelected &&
                    "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer",
                  ticket.estado === "reservado" && !isSelected &&
                    "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 cursor-pointer",
                  ticket.estado === "vendido" &&
                    "bg-red-50 text-red-400 border-red-200 cursor-not-allowed opacity-60",
                  isSelected &&
                    "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300"
                )}
              >
                {ticket.numero}
              </button>
            );
          })}
        </div>
      </div>

      {/* Purchase Bar */}
      {totalSelected > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">
                {totalSelected} boletas seleccionadas
              </p>
              <p className="text-sm text-gray-500">Total: {formatCurrency(totalCost)}</p>
            </div>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Comprar
            </button>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <PurchaseModal
          count={totalSelected}
          total={totalCost}
          onClose={() => setShowPurchaseModal(false)}
          onConfirm={handlePurchase}
          loading={bulkPurchase.isPending}
        />
      )}
    </div>
  );
}

function PurchaseModal({
  count,
  total,
  onClose,
  onConfirm,
  loading,
}: {
  count: number;
  total: number;
  onClose: () => void;
  onConfirm: (buyer: BuyerInfo) => void;
  loading: boolean;
}) {
  const [buyer, setBuyer] = useState<BuyerInfo>({
    nombre: "",
    telefono: "",
    email: "",
    metodo_pago: "efectivo",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(buyer);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Confirmar Compra</h2>
          <p className="text-sm text-gray-500 mb-4">
            {count} boletas - Total: {formatCurrency(total)}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del comprador *
              </label>
              <input
                value={buyer.nombre}
                onChange={(e) => setBuyer({ ...buyer, nombre: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <input
                value={buyer.telefono}
                onChange={(e) => setBuyer({ ...buyer, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="+573001234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                value={buyer.email}
                onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="comprador@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de pago</label>
              <select
                value={buyer.metodo_pago}
                onChange={(e) => setBuyer({ ...buyer, metodo_pago: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Procesando..." : "Confirmar Compra"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
