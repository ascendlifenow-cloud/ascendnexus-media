import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PublicAudioPlayerProvider } from "./providers/PublicAudioPlayerProvider";
import { PublicConsentProvider } from "./providers/PublicConsentProvider";
import { AppRouter } from "./routes/AppRouter";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PublicAudioPlayerProvider>
        <PublicConsentProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </PublicConsentProvider>
      </PublicAudioPlayerProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
