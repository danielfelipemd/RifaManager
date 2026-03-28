import { useQuery } from "@tanstack/react-query";
import { getMetrics } from "@/api/dashboard";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, ShoppingCart, Ticket, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: getMetrics,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const cards = [
    {
      title: "Ingresos Totales",
      value: formatCurrency(metrics?.ingresos_totales ?? 0),
      icon: DollarSign,
      color: "bg-green-500",
    },
    {
      title: "Compras Realizadas",
      value: metrics?.total_compras ?? 0,
      icon: ShoppingCart,
      color: "bg-blue-500",
    },
    {
      title: "Rifas Activas",
      value: metrics?.rifas_activas ?? 0,
      icon: TrendingUp,
      color: "bg-indigo-500",
    },
    {
      title: "Tickets Vendidos",
      value: metrics?.tickets_vendidos ?? 0,
      icon: Ticket,
      color: "bg-orange-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon size={20} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Tickets</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Disponibles</span>
              <span className="text-sm font-semibold text-green-600">
                {metrics?.tickets_disponibles ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Reservados</span>
              <span className="text-sm font-semibold text-yellow-600">
                {metrics?.tickets_reservados ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Vendidos</span>
              <span className="text-sm font-semibold text-red-600">
                {metrics?.tickets_vendidos ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
