import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";

// Enregistrement du service worker avec vérification active des mises à jour :
// - vérifie immédiatement au chargement
// - revérifie toutes les 60 secondes tant que l'app est ouverte
// - revérifie à chaque fois que l'app redevient visible (retour au premier plan)
// - applique la nouvelle version automatiquement dès qu'elle est détectée, sans
//   jamais demander à l'utilisateur de vider le cache manuellement.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    setInterval(() => {
      registration.update().catch(() => {});
    }, 60 * 1000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        registration.update().catch(() => {});
      }
    });
  },
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {
    // Rien à faire — juste un point d'accroche disponible si besoin plus tard.
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
