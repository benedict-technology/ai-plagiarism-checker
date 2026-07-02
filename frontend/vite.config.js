import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/check": "http://127.0.0.1:8000",
      "/evaluation": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
      "/login": "http://127.0.0.1:8000",
      "/me": "http://127.0.0.1:8000",
      "/register": "http://127.0.0.1:8000",
      "/report": "http://127.0.0.1:8000",
      "/sources": "http://127.0.0.1:8000",
      "/upload-document": "http://127.0.0.1:8000"
    }
  }
});
