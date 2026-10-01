import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-md px-6 pt-20 text-center">
        <h1 className="text-xl font-bold">Algo falló al mostrar esta pantalla</h1>
        <p className="mt-2 text-sm text-muted">{this.state.error.message}</p>
        <button type="button" className="mt-6 font-semibold text-primary" onClick={() => window.location.assign("/")}>
          Volver al inicio
        </button>
      </div>
    );
  }
}
