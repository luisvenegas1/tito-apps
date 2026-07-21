import { Component, ReactNode } from "react";

/**
 * Sin esto, cualquier excepción durante el render deja la pantalla en blanco
 * y hay que abrir la consola para saber qué pasó. Con esto, el error se lee
 * en pantalla — que es justo lo que uno necesita cuando está probando en el
 * celular y no tiene DevTools a mano.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Queda en consola para cuando sí haya DevTools.
    console.error("GolPay se cayó:", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="p-6">
        <div className="card border-l-4 border-red-400">
          <h1 className="text-lg font-bold">Algo se rompió</h1>
          <p className="mt-1 text-sm text-gray-500">
            La pantalla no pudo dibujarse. El detalle de abajo es lo que hay que mirar.
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-red-600">
            {error.message}
          </pre>
          <div className="mt-3 flex gap-2">
            <button
              className="btn-primary"
              onClick={() => { this.setState({ error: null }); window.location.assign("/"); }}
            >
              Ir al inicio
            </button>
            <button className="btn-ghost" onClick={() => window.location.reload()}>
              Recargar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
