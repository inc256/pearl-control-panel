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
      // The admin panel needs live auth/data behavior; remove stale PWA workers
      // so returning to a tab cannot be affected by an old cached app shell.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
        });
      }).catch(() => {});

      if ("caches" in window) {
        caches.keys().then((cacheNames) => {
          cacheNames
            .filter((cacheName) => cacheName.startsWith("pearl-pwa-"))
            .forEach((cacheName) => caches.delete(cacheName).catch(() => {}));
        }).catch(() => {});
      }
    });

  }
}

createRoot(document.getElementById("root")!).render(<App />);