import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";

const Auth = lazy(() => import("./pages/Auth"));
const Landing = lazy(() => import("./pages/Landing"));
const HomeRedirect = lazy(() => import("./pages/HomeRedirect"));
const PackageEditor = lazy(() => import("./pages/PackageEditor"));
const Bookings = lazy(() => import("./pages/Bookings"));
const BusinessStats = lazy(() => import("./pages/BusinessStats"));
const BusinessSummary = lazy(() => import("./pages/BusinessSummary"));
const Roles = lazy(() => import("./pages/Roles"));
const Clients = lazy(() => import("./pages/Clients"));
const Payments = lazy(() => import("./pages/Payments"));
const Contributions = lazy(() => import("./pages/Contributions"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" richColors />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/landing" element={<ProtectedRoute><Landing /></ProtectedRoute>} />
              <Route path="/landing/packages/:id" element={<ProtectedRoute><PackageEditor /></ProtectedRoute>} />
              <Route path="/landing/packages/new" element={<ProtectedRoute><PackageEditor /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
              <Route path="/business-stats" element={<Navigate to="/business-statscan" replace />} />
              <Route path="/business-statscan" element={<ProtectedRoute><BusinessStats /></ProtectedRoute>} />
              <Route path="/business-summary" element={<ProtectedRoute><BusinessSummary /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/contributions" element={<ProtectedRoute><Contributions /></ProtectedRoute>} />
              <Route path="/roles" element={<ProtectedRoute allowedRoles={["developer", "secretary"]}><Roles /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
