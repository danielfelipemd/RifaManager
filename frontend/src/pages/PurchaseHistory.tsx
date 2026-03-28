import { useQuery } from "@tanstack/react-query";
import client from "@/api/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Purchase } from "@/types";

export default function PurchaseHistory() {
  const { data: purchases, isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data } = await client.get<Purchase[]>("/purchases");
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Historial de Compras</h1>

      {!purchases?.length ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <p className="text-gray-500">No hay compras registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Comprador</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Telefono</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Monto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Metodo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.comprador_nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{p.comprador_telefono || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">
                      {formatCurrency(p.monto)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.metodo_pago || "-"}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
