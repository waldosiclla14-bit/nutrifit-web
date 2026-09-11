'use client';

import { Component, type ReactNode } from 'react';

export class AdminErrorGuard extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-bold text-red-700">Algo falló al mostrar esta sección</p>
          <p className="mt-1 text-xs text-red-500">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-outline mt-4 px-4 py-2 text-xs min-h-[44px]"
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
