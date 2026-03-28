import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import RaffleList from "@/pages/RaffleList";
import RaffleCreate from "@/pages/RaffleCreate";
import RaffleDetail from "@/pages/RaffleDetail";
import TicketGrid from "@/pages/TicketGrid";
import PurchaseHistory from "@/pages/PurchaseHistory";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/raffles" element={<RaffleList />} />
              <Route path="/raffles/new" element={<RaffleCreate />} />
              <Route path="/raffles/:id" element={<RaffleDetail />} />
              <Route path="/raffles/:id/tickets" element={<TicketGrid />} />
              <Route path="/purchases" element={<PurchaseHistory />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
