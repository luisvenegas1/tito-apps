import React from "react";
import ReactDOM from "react-dom/client";
import { applyBrand, titoAppsBrand } from "@titoapps/brand";
import { App } from "./App";
import "./index.css";

// Marca por defecto del playground: Tito Apps (madre).
applyBrand(titoAppsBrand);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
