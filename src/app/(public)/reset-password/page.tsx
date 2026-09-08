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
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-line bg-soft p-8 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accentDeep">
            <KeyRound size={20} />
          </span>
          <div>
            <p className="section-label">NUTRIFIT</p>
            <h1 className="font-display text-xl uppercase tracking-wide">Restablecer contraseña</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          Usa tu clave de administrador (la variable <code className="rounded bg-soft2 px-1 py-0.5 text-xs">ADMIN_PASSWORD</code> de Render) para fijar una nueva contraseña.
        </p>
        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="label">Clave de administrador (ADMIN_PASSWORD)</span>
            <input
              type="password"
              value={bootstrapKey}
              onChange={(e) => setBootstrapKey(e.target.value)}
              className="input"
              placeholder="Pega tu ADMIN_PASSWORD de Render"
              required
            />
          </label>
          <label className="block">
            <span className="label">Email del usuario</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </label>
          <label className="block">
            <span className="label">Nueva contraseña</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </label>
        </div>
        {error && (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-500">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        {ok && (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-accentDeep">
            <CheckCircle size={14} /> Contraseña actualizada. Ahora puedes ir a <a href="/login" className="underline">/login</a>.
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="btn-accent mt-6 w-full"
        >
          {saving ? 'Guardando…' : 'Restablecer contraseña'}
        </button>
      </form>
    </div>
  );
}
