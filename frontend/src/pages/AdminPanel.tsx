import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approvePayment,
  createTenant,
  deactivateTenant,
  getAllPaymentRequests,
  getAllTenants,
  getPlatformStats,
  getTenantUsers,
  rejectPayment,
  updateTenant,
  type PaymentRequest,
  type TenantDetail,
  type TenantUser,
} from "@/api/admin";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Building2, Check, ChevronDown, ChevronRight, CreditCard, Plus, Power, Users, X } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"tenants" | "payments">("tenants");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel de Administracion</h1>
      <div className="flex gap-2 mb-6 border-b">
        <button onClick={() => setActiveTab("tenants")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "tenants" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"}`}>
          Clientes
        </button>
        <button onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "payments" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"}`}>
          Solicitudes de Pago
        </button>
      </div>
      {activeTab === "tenants" && <TenantsTab />}
      {activeTab === "payments" && <PaymentsTab />}
    </div>
  );
}

function PaymentsTab() {
  const queryClient = useQueryClient();
  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => getAllPaymentRequests(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvePayment(id, "Pago verificado"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("Pago aprobado - Rifa activada");
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectPayment(id, "Pago no verificado"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success("Solicitud rechazada");
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  const pendientes = payments?.filter((p) => p.estado === "pendiente") ?? [];
  const historial = payments?.filter((p) => p.estado !== "pendiente") ?? [];

  return (
    <div className="space-y-6">
      {/* Pending */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Pendientes ({pendientes.length})
        </h3>
        {pendientes.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white rounded-xl border p-6 text-center">No hay solicitudes pendientes</p>
        ) : (
          <div className="space-y-3">
            {pendientes.map((p) => (
              <div key={p.id} className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{p.tenant_nombre}</p>
                    <p className="text-sm text-gray-600">Rifa: {p.raffle_nombre}</p>
                  </div>
                  <p className="text-xl font-bold text-indigo-700">{formatCurrency(p.monto)}</p>
                </div>
                <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                  <p>Comision: {(Number(p.porcentaje) * 100).toFixed(0)}% | Metodo: {p.metodo_pago}</p>
                  {p.comprobante_ref && <p>Ref: {p.comprobante_ref}</p>}
                  {p.notas_cliente && <p>Notas: {p.notas_cliente}</p>}
                  <p>Fecha: {formatDate(p.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveMutation.mutate(p.id)} disabled={approveMutation.isPending}
                    className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    <Check size={16} />Aprobar y Activar Rifa
                  </button>
                  <button onClick={() => rejectMutation.mutate(p.id)} disabled={rejectMutation.isPending}
                    className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                    <X size={16} />Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {historial.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Historial</h3>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rifa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Monto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {historial.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">{p.tenant_nombre}</td>
                    <td className="px-4 py-3">{p.raffle_nombre}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(p.monto)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.estado === "aprobado" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>{p.estado}</span>
                    </td>
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

function TenantsTab() {
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: getPlatformStats });
  const { data: tenants, isLoading } = useQuery({ queryKey: ["admin-tenants"], queryFn: getAllTenants });
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deactivateMutation = useMutation({
    mutationFn: deactivateTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Tenant desactivado");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error";
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => updateTenant(id, { activo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Estado actualizado");
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  const statCards = [
    { label: "Clientes", value: stats?.total_tenants ?? 0, color: "bg-blue-500" },
    { label: "Activos", value: stats?.tenants_activos ?? 0, color: "bg-green-500" },
    { label: "Usuarios", value: stats?.total_users ?? 0, color: "bg-purple-500" },
    { label: "Rifas", value: stats?.total_raffles ?? 0, color: "bg-orange-500" },
    { label: "Compras", value: stats?.total_purchases ?? 0, color: "bg-indigo-500" },
    { label: "Ingresos", value: formatCurrency(stats?.total_revenue ?? 0), color: "bg-green-600" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administracion</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          Nuevo Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tenants List */}
      <div className="space-y-3">
        {tenants?.filter(t => t.slug !== "platform").map((tenant) => (
          <div key={tenant.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id)}
            >
              <div className="flex items-center gap-3">
                {expandedTenant === tenant.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Building2 size={18} className="text-gray-400" />
                <div>
                  <h3 className="font-semibold text-gray-900">{tenant.nombre}</h3>
                  <p className="text-xs text-gray-400">{tenant.slug} | Plan: {tenant.plan}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex gap-4 text-xs text-gray-500">
                  <span>{tenant.total_users} usuarios</span>
                  <span>{tenant.total_raffles} rifas</span>
                  <span>{formatCurrency(tenant.total_revenue)}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  tenant.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {tenant.activo ? "Activo" : "Inactivo"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMutation.mutate({ id: tenant.id, activo: !tenant.activo });
                  }}
                  className={`p-1.5 rounded ${tenant.activo ? "text-red-500 hover:bg-red-50" : "text-green-500 hover:bg-green-50"}`}
                  title={tenant.activo ? "Desactivar" : "Activar"}
                >
                  <Power size={16} />
                </button>
              </div>
            </div>

            {expandedTenant === tenant.id && (
              <TenantExpanded tenantId={tenant.id} tenant={tenant} />
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
            queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          }}
        />
      )}
    </div>
  );
}

function TenantExpanded({ tenantId, tenant }: { tenantId: string; tenant: TenantDetail }) {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-tenant-users", tenantId],
    queryFn: () => getTenantUsers(tenantId),
  });

  return (
    <div className="border-t bg-gray-50 p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border">
          <p className="text-xs text-gray-500">Usuarios</p>
          <p className="text-lg font-bold">{tenant.total_users}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <p className="text-xs text-gray-500">Rifas</p>
          <p className="text-lg font-bold">{tenant.total_raffles}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <p className="text-xs text-gray-500">Compras</p>
          <p className="text-lg font-bold">{tenant.total_purchases}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <p className="text-xs text-gray-500">Ingresos</p>
          <p className="text-lg font-bold">{formatCurrency(tenant.total_revenue)}</p>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
        <Users size={14} /> Usuarios del cliente
      </h4>

      {isLoading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="bg-white">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-500">Nombre</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">Email</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">Rol</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">Estado</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">Creado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users?.map((u) => (
              <tr key={u.id} className="bg-white">
                <td className="px-3 py-2 font-medium">{u.nombre}</td>
                <td className="px-3 py-2 text-gray-600">{u.email}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>{u.role}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>{u.activo ? "Activo" : "Inactivo"}</span>
                </td>
                <td className="px-3 py-2 text-gray-400">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    nombre: "", slug: "", plan: "basic",
    admin_nombre: "", admin_email: "", admin_password: "", admin_telefono: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (name === "nombre") {
      setForm((p) => ({ ...p, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTenant({
        ...form,
        admin_telefono: form.admin_telefono || undefined,
      });
      toast.success("Cliente creado con su administrador");
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al crear";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Nuevo Cliente</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Datos del cliente</h3>
            <div className="space-y-3">
              <input name="nombre" placeholder="Nombre de la organizacion" value={form.nombre} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              <div className="flex gap-3">
                <input name="slug" placeholder="Slug" value={form.slug} onChange={handleChange} required className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                <select name="plan" value={form.plan} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Administrador del cliente</h3>
            <div className="space-y-3">
              <input name="admin_nombre" placeholder="Nombre del admin" value={form.admin_nombre} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              <input name="admin_email" placeholder="Email del admin" type="email" value={form.admin_email} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              <input name="admin_password" placeholder="Contrasena del admin" type="password" value={form.admin_password} onChange={handleChange} required minLength={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              <input name="admin_telefono" placeholder="Telefono (opcional)" value={form.admin_telefono} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Creando..." : "Crear Cliente"}
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
