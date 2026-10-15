import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Ruang Ujian CBT SMA",
        short_name: "Ruang Ujian",
        theme_color: "#4f46e5",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "/",
        icons: [],
      },
      workbox: { navigateFallback: "index.html" },
    }),
  ],
});
