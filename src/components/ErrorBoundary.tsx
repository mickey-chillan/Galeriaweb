import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ocurrió un error inesperado al cargar el atlas.',
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090F] text-[#F4F6FA] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#0F1420] border border-white/10 rounded-xl p-6 space-y-4">
            <h1 className="font-display text-2xl font-semibold text-[#FCD34D]">
              Algo interrumpió la sincronización
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              No pudimos completar la última operación en el atlas. Puedes recargar la
              página para restablecer la conexión.
            </p>
            <p className="font-mono-tabular text-xs text-slate-400 bg-[#07090F] border border-white/10 rounded-lg p-3 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#F5B742] text-[#07090F] hover:bg-[#FCD34D] transition-colors"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
