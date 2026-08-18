import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, Suspense, useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/auth/AuthProvider";
import AppRoutes from "@/routes/AppRoutes";

// Sane defaults: don't refetch everything just because the tab regained
// focus after a couple of seconds. Data is considered "fresh" for 1 minute,
// so switching tabs briefly won't trigger a refetch storm across every
// mounted query. Individual queries can still opt back into
// refetchOnWindowFocus if they genuinely need to be live (e.g. a status feed).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Listen for the "a new service worker is ready" signal dispatched from
  // main.tsx, instead of forcing a silent reload mid-session (which can
  // yank a user out of an in-progress edit).
  useEffect(() => {
    const handleUpdateReady = () => setUpdateAvailable(true);
    window.addEventListener("sw-update-available", handleUpdateReady);
    return () => window.removeEventListener("sw-update-available", handleUpdateReady);
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

  const handleUpdateClick = () => {
    window.location.reload();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <Toaster />

        <ErrorBoundary>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="p-6">Loading app...</div>}>
                <AppRoutes />
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ErrorBoundary>

        {isInstallable && (
          <div className="fixed bottom-4 right-4 bg-white shadow p-4 rounded z-50">
            <p className="mb-2">Install Pearl Admin</p>
            <button onClick={handleInstallClick}>Install</button>
          </div>
        )}

        {updateAvailable && (
          <div className="fixed bottom-4 left-4 bg-white shadow p-4 rounded z-50">
            <p className="mb-2">A new version is available.</p>
            <button onClick={handleUpdateClick}>Refresh to update</button>
          </div>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;