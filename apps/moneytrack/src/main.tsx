import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@titoapps/ui";
import { applyBrand, moneytrackBrand } from "@titoapps/brand";
import "@titoapps/brand/tokens.css";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { queryClient } from "./lib/query";
import { initTheme } from "./lib/theme";

applyBrand(moneytrackBrand);

// Tema elegido en Ajustes; por defecto sigue al sistema (claro u oscuro).
initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
