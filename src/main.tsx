import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if ("serviceWorker" in navigator) {
  if (import.meta.env.DEV) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {
            // Best-effort cleanup for dev; stale registrations should not block the app.
          });
        });
      });

      if ("caches" in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            caches.delete(cacheName).catch(() => {
              // Ignore cache deletion failures during development cleanup.
            });
          });
        });
      }
    });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Service worker registration is optional; app still works without it.
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
