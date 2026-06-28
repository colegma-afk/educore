import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En producción (GitHub Pages) el sitio se sirve bajo /educore/.
// En desarrollo se mantiene en la raíz para que `npm run dev` funcione igual.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/educore/" : "/",
  plugins: [react()],
  server: { port: 5173, open: true },
}));
