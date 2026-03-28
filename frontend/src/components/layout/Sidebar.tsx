import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  Users,
  ShoppingCart,
  Settings,
  Trophy,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "super_admin"] },
  { to: "/raffles", icon: Ticket, label: "Rifas", roles: ["admin", "super_admin", "vendedor"] },
  { to: "/purchases", icon: ShoppingCart, label: "Compras", roles: ["admin", "super_admin", "vendedor"] },
  { to: "/lottery", icon: Trophy, label: "Loterias", roles: ["admin", "super_admin", "vendedor"] },
  { to: "/users", icon: Users, label: "Usuarios", roles: ["admin", "super_admin"] },
  { to: "/settings", icon: Settings, label: "Config", roles: ["admin", "super_admin"] },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white transform transition-transform lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">RifaManager</h1>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="mt-4 space-y-1 px-2">
          {navItems
            .filter((item) => user && item.roles.includes(user.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 truncate">{user?.nombre}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
      </aside>
    </>
  );
}
