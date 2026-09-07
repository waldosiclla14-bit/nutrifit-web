'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [bootstrapKey, setBootstrapKey] = useState('');
  const [email, setEmail] = useState('admin@nutrifit.cl');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk(false);
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/bootstrap', {
        method: 'POST',
        body: { bootstrapKey, email, newPassword },
      });
      setOk(true);
      setBootstrapKey('');
      setNewPassword('');
    } catch (err: any) {
      setError(err?.message || 'Error al restablecer la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-px flex min-h-[70vh] items-center justify-center py-16">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-sport-border/50 bg-sport-card p-8 shadow-sportCard">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sport-green/15 text-sport-green">
            <KeyRound size={20} />
          </span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-sport-green">NUTRIFIT</p>
            <h1 className="font-display text-xl uppercase tracking-wide text-white">Restablecer contraseña</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-white/50">
          Usa tu clave de administrador (la variable <code className="rounded bg-white/10 px-1 py-0.5 text-xs">ADMIN_PASSWORD</code> de Render) para fijar una nueva contraseña.
        </p>
        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-white/40">Clave de administrador (ADMIN_PASSWORD)</span>
            <input
              type="password"
              value={bootstrapKey}
              onChange={(e) => setBootstrapKey(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sport-border/50 bg-sport-bg px-4 py-3 text-sm text-white placeholder-white/30 focus:border-sport-green focus:outline-none"
              placeholder="Pega tu ADMIN_PASSWORD de Render"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/40">Email del usuario</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sport-border/50 bg-sport-bg px-4 py-3 text-sm text-white placeholder-white/30 focus:border-sport-green focus:outline-none"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/40">Nueva contraseña</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-sport-border/50 bg-sport-bg px-4 py-3 text-sm text-white placeholder-white/30 focus:border-sport-green focus:outline-none"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </label>
        </div>
        {error && (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-400">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        {ok && (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-sport-green">
            <CheckCircle size={14} /> Contraseña actualizada. Ahora puedes ir a <a href="/login" className="underline">/login</a>.
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-sport-green px-6 py-3.5 text-sm font-bold tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sportGlow disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Restablecer contraseña'}
        </button>
      </form>
    </div>
  );
}
