import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Captura errores de render para evitar una pantalla en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[NutriCoach] Error de render:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="text-4xl">🤕</span>
          <h1 className="text-lg font-bold text-slate-800">Algo salió mal</h1>
          <p className="max-w-xs text-sm text-slate-500">
            Ocurrió un error inesperado. Recargá la página; si persiste, contanos.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white active:scale-95"
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
