import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["logo.jpg", "icon-192.png", "icon-512.png"],
      // Ajoute la réception des notifications push au service worker généré
      workbox: {
        importScripts: ["push-sw.js"]
      },
      manifest: {
        name: "Spritz Connection",
        short_name: "Spritz",
        description: "Soirées italiennes à Paris — inscriptions, paiement et discussion par événement.",
        theme_color: "#FBF3E0",
        background_color: "#FBF3E0",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});
