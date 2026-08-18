import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if ("serviceWorker" in navigator) {
  if (import.meta.env.DEV) {
    // Dev mode: make sure no stale SW/cache from a previous prod build
    // interferes with local development.
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
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Actively check for a new service worker on every load,
          // instead of waiting for the browser's own (slow) update cycle.
          registration.update().catch(() => {});

          // If a new worker is already waiting (e.g. found on this same load),
          // notify the app instead of forcing an immediate reload.
          if (registration.waiting) {
            window.dispatchEvent(new Event("sw-update-available"));
          }

          // Watch for a new worker being found during this session.
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // A new SW has installed and there's already an active controller,
                // meaning this is an update (not the first install).
                window.dispatchEvent(new Event("sw-update-available"));
              }
            });
          });
        })
        .catch(() => {
          // Service worker registration is optional; app still works without it.
        });
    });

    // NOTE: we intentionally do NOT auto-reload on controllerchange anymore.
    // Silently reloading mid-session can interrupt a user who's mid-edit on
    // a client record. Instead, App.tsx shows an "Update available" prompt
    // (see the "sw-update-available" event above) and only reloads when the
    // user explicitly clicks it.
    //
    // If you'd rather go back to the old silent-reload behavior, uncomment this:
    //
    // let refreshing = false;
    // navigator.serviceWorker.addEventListener("controllerchange", () => {
    //   if (refreshing) return;
    //   refreshing = true;
    //   window.location.reload();
    // });
  }
}

createRoot(document.getElementById("root")!).render(<App />);