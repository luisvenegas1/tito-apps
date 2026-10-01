import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@titoapps/ui";
import { applyBrand, moneytrackBrand, setTheme, type BrandTheme } from "@titoapps/brand";
import "@titoapps/brand/tokens.css";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { queryClient } from "./lib/query";
import { THEME_KEY } from "./features/settings/SettingsPage";

applyBrand(moneytrackBrand);

// Tema guardado; si no hay, el del sistema.
let saved: string | null = null;
try {
  saved = localStorage.getItem(THEME_KEY);
} catch {
  /* sin almacenamiento */
}
setTheme((saved as BrandTheme) ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

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
