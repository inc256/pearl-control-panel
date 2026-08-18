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
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        // Actively check for a new service worker on every load,
        // instead of waiting for the browser's own (slow) update cycle.
        registration.update().catch(() => {});
      }).catch(() => {
        // Service worker registration is optional; app still works without it.
      });
    });

    // When a new service worker takes control, reload once to pick up
    // the fresh index.html / assets instead of leaving the old ones cached.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);