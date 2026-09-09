import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.jpg"],
      manifest: {
        name: "Spritz Connection",
        short_name: "Spritz",
        description: "Soirées italiennes à Paris — inscriptions, paiement et discussion par événement.",
        theme_color: "#FBF3E0",
        background_color: "#FBF3E0",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "logo.jpg", sizes: "512x512", type: "image/jpeg", purpose: "any" },
          { src: "logo.jpg", sizes: "512x512", type: "image/jpeg", purpose: "maskable" }
        ]
      }
    })
  ]
});
