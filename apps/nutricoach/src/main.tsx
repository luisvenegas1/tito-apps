import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { queryClient } from "./lib/query";
import { applyBrand, nutricoachBrand } from "@titoapps/brand";
import "@titoapps/brand/tokens.css";
import "./index.css";

// Aplica los design tokens de la marca NutriCoach.
applyBrand(nutricoachBrand);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
