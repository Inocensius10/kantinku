import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { AppProvider } from "./contexts/AppContext";
import AppErrorBoundary from "./components/ui/AppErrorBoundary";

import "./styles.css";

// Hapus loading screen jika ada
const loading = document.getElementById("app-loading");
if (loading) {
  loading.remove();
}

// Pastikan root ada
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element (#root) tidak ditemukan.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "14px",
            fontWeight: 600,
          },
        }}
      />
    </AppErrorBoundary>
  </StrictMode>
);