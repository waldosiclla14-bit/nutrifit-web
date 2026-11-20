'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearSessionCookie, clearSessionUser, fetchSession, setSessionCookie, setSessionUser } from '@/lib/api';
import { isValidPin, sanitizePin } from '@/lib/courier/helpers';

type Mode = 'equipo' | 'reparto';

export default function LoginClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('equipo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextParam, setNextParam] = useState<string | null>(null);

  useEffect(() => {
    try {
      const n = new URLSearchParams(window.location.search).get('next');
      setNextParam(n && n.startsWith('/') && !n.startsWith('//') ? n : null);
      if (n === '/reparto') setMode('reparto');
    } catch {
      // ignore
    }
  }, []);

  const target = nextParam || (mode === 'reparto' ? '/reparto' : '/admin');

  const finish = async (user: { id?: string; name?: string; email?: string; role?: string }) => {
    // El JWT quedó en cookie HttpOnly (el servidor la seteó). Guardamos solo
    // el perfil para mostrar nombre/rol; la validez la confirma /auth/me.
    if (user) setSessionUser(user);
    setSessionCookie();
    const session = await fetchSession();
    if (!session) {
      // No dejar nf_session puesta: el proxy rebotaría /login → destino en loop.
      clearSessionCookie();
      clearSessionUser();
      setError('El navegador bloqueó las cookies (modo privado o cookies desactivadas). Actívalas e intenta de nuevo.');
      return;
    }
    router.replace(target);
    router.refresh();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'reparto') {
        if (!isValidPin(pin)) {
          setError('El PIN debe tener entre 4 y 6 dígitos.');
          return;
        }
        const res = await apiFetch<{ user: { id: string; name: string; email: string; role: string } }>('/auth/pin', {
          method: 'POST',
          body: { pin },
        });
        await finish(res.user);
        return;
      }

      const res = await apiFetch<{ user: { id: string; name: string; email: string; role: string } }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      await finish(res.user);
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError('');
    setPin('');
  };

  return (
    <div className="container-px flex min-h-[70vh] items-center justify-center py-16">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-line bg-paper p-8 shadow-soft">
        <p className="section-label">NUTRIFIT</p>
        <h1 className="mt-2 font-display text-2xl uppercase tracking-wide">Acceso</h1>
        <p className="mt-1 text-sm text-muted">Zona restringida. Inicia sesión para continuar.</p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-soft p-1">
          <button
            type="button"
            onClick={() => switchMode('equipo')}
            aria-pressed={mode === 'equipo'}
            className={`rounded-xl py-2 text-xs font-bold uppercase tracking-wide ${
              mode === 'equipo' ? 'bg-ink text-white' : 'text-muted'
            }`}
          >
            Equipo
          </button>
          <button
            type="button"
            onClick={() => switchMode('reparto')}
            aria-pressed={mode === 'reparto'}
            className={`rounded-xl py-2 text-xs font-bold uppercase tracking-wide ${
              mode === 'reparto' ? 'bg-ink text-white' : 'text-muted'
            }`}
          >
            Repartidor
          </button>
        </div>

        {mode === 'equipo' ? (
          <div className="mt-5 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="input"
              autoComplete="username"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="input"
              autoComplete="current-password"
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(sanitizePin(e.target.value))}
              placeholder="PIN de 4 a 6 dígitos"
              className="input text-center text-2xl tracking-[0.5em]"
              autoComplete="one-time-code"
              maxLength={6}
              aria-label="PIN del repartidor"
            />
            <p className="text-center text-xs text-muted">
              Tu PIN te lo entrega el administrador. No lo compartas.
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="btn-accent mt-6 w-full">
          {loading ? 'Entrando…' : mode === 'reparto' ? 'Entrar con PIN' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
