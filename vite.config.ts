import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const mediaApiTarget = (process.env.VITE_MEDIA_UPLOAD_API_BASE_URL ?? process.env.MEDIA_API_BASE_URL ?? "http://127.0.0.1:5313").replace(/\/+$/, "");

const writeJsonProxyError = (res: unknown, status: number, message: string): void => {
  if (!res || typeof res !== "object" || !("writeHead" in res) || !("end" in res)) return;
  const response = res as {
    headersSent?: boolean;
    writeHead: (statusCode: number, headers?: Record<string, string>) => void;
    end: (body?: string) => void;
  };
  if (response.headersSent) return;
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify({ success: false, errors: [message] }));
};

export default defineConfig({
  plugins: [react],
  server: {
    host: "0.0.0.0",
    port: 5303,
    strictPort: true,
    proxy: {
      "/api": {
        target: mediaApiTarget,
        changeOrigin: true,
        secure: false,
        timeout: 180_000,
        proxyTimeout: 180_000,
        configure: (proxy) => {
          proxy.on("error", (_error, request, response) => {
            if (request.url?.startsWith("/api/admin/media/upload")) {
              writeJsonProxyError(response, 502, "Development upload proxy lost connection to the media API. Please retry the upload.");
            }
          });
        },
      },
      "/health": {
        target: mediaApiTarget,
        changeOrigin: true,
        secure: false,
      },
      "/uploads/media/public": {
        target: mediaApiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          state: ["zustand"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
