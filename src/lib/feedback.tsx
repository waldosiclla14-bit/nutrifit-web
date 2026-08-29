'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

export { SonnerToaster };

export const toast = {
  success: (msg: string) => sonnerToast.success(msg),
  error: (msg: string) => sonnerToast.error(msg),
  info: (msg: string) => sonnerToast.info(msg),
};

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    nonce: number;
  } | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ opts, nonce: Date.now() });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {state && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          onClick={() => close(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-3xl border border-line bg-paper p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            <p id="confirm-title" className="font-display text-xl uppercase">
              {state.opts.title}
            </p>
            <p id="confirm-message" className="mt-2 text-sm text-muted">
              {state.opts.message}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                autoFocus
                onClick={() => close(false)}
                className="btn-outline px-4 py-2 text-xs"
              >
                {state.opts.cancelLabel || 'Cancelar'}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-2 text-xs font-bold text-white ${
                  state.opts.danger ? 'bg-red-600 hover:bg-red-700' : 'btn-accent'
                }`}
              >
                {state.opts.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
