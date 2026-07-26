import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import PackageEditor from "./pages/PackageEditor";
import Bookings from "./pages/Bookings";
import BusinessStats from "./pages/BusinessStats";
import Clients from "./pages/Clients";
import Payments from "./pages/Payments";
import Contributions from "./pages/Contributions";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" richColors />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/business-statscan" replace />} />
            <Route path="/landing" element={<ProtectedRoute><Landing /></ProtectedRoute>} />
            <Route path="/landing/packages/:id" element={<ProtectedRoute><PackageEditor /></ProtectedRoute>} />
            <Route path="/landing/packages/new" element={<ProtectedRoute><PackageEditor /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="/business-stats" element={<Navigate to="/business-statscan" replace />} />
            <Route path="/business-statscan" element={<ProtectedRoute><BusinessStats /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/contributions" element={<ProtectedRoute><Contributions /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
