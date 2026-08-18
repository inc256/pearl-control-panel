import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, Suspense, useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/auth/AuthProvider";
import AppRoutes from "@/routes/AppRoutes";

const queryClient = new QueryClient();

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p>Please refresh and try again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredInstallPrompt) return;

    await deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstallable(false);
    }

    setDeferredInstallPrompt(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <Toaster />

        <ErrorBoundary>
          {/* ✅ CRITICAL FIX: Provider wraps everything */}
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="p-6">Loading app...</div>}>
                <AppRoutes />
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ErrorBoundary>

        {isInstallable && (
          <div className="fixed bottom-4 right-4 bg-white shadow p-4 rounded">
            <p className="mb-2">Install Pearl Admin</p>
            <button onClick={handleInstallClick}>Install</button>
          </div>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;