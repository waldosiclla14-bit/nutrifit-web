'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setSessionCookie, setToken } from '@/lib/api';

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState('/admin');

  useEffect(() => {
    try {
      setNext(new URLSearchParams(window.location.search).get('next') || '/admin');
    } catch {
      // ignore
    }
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setToken(res.access_token);
      setSessionCookie();
      router.replace(next);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-px flex min-h-[70vh] items-center justify-center py-16">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-line bg-paper p-8 shadow-soft">
        <p className="section-label">NUTRIFIT</p>
        <h1 className="mt-2 font-display text-2xl uppercase tracking-wide">Acceso</h1>
        <p className="mt-1 text-sm text-muted">Zona restringida. Inicia sesión para continuar.</p>
        <div className="mt-6 space-y-3">
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
        {error && <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="btn-accent mt-6 w-full">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
