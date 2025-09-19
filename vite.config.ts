import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "localhost-key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "localhost.pem")),
    },
    port: 5173,
    proxy: {
      // More specific proxy pattern
      '/__/auth/handler': {
        target: 'https://dev-app-526e2.firebaseapp.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path
      },
      '/__/auth': {
        target: 'https://dev-app-526e2.firebaseapp.com',
        changeOrigin: true,
        secure: true
      }
    }
  },
});