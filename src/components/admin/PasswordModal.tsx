'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export function PasswordModal({
  token,
  onClose,
  onChanged,
}: {
  token: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const save = async () => {
    setError('');
    setOk(false);
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        token,
        body: { currentPassword, newPassword },
      });
      setOk(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      onChanged();
    } catch (err: any) {
      setError(err?.message || 'Error al cambiar la contraseña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-xl uppercase">Cambiar contraseña</p>
        <p className="mt-1 text-sm text-muted">Actualiza la contraseña de tu cuenta.</p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-muted">Contraseña actual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input mt-1"
              autoComplete="current-password"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Nueva contraseña</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input mt-1"
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted">Confirmar nueva contraseña</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input mt-1"
              autoComplete="new-password"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>}
        {ok && <p className="mt-3 text-xs font-semibold text-emerald-600">Contraseña actualizada correctamente.</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-xs">
            Cerrar
          </button>
          <button onClick={save} disabled={saving} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}