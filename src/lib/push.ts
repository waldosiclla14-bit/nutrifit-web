'use client';

import { apiFetch } from './api';

export function pushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  const out: Uint8Array<ArrayBuffer> = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Suscribe este dispositivo: pide permiso, crea la suscripción Push con la
// clave VAPID del servidor y la registra en el backend.
export async function subscribePush(token: string): Promise<'ok' | 'denied' | 'error'> {
  if (!pushSupported()) return 'error';
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await apiFetch<{ publicKey: string }>('/push/vapid-key', { token });
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = sub.toJSON();
    await apiFetch('/push/subscribe', {
      method: 'POST',
      token,
      body: {
        endpoint: sub.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      },
    });
    return 'ok';
  } catch {
    return 'error';
  }
}

export async function unsubscribePush(token: string): Promise<void> {
  try {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await apiFetch('/push/unsubscribe', {
        method: 'POST',
        token,
        body: { endpoint: sub.endpoint },
      }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  } catch {
    // nunca romper la UI por el push
  }
}

export async function sendTestPush(token: string): Promise<boolean> {
  try {
    const res = await apiFetch<{ sent: number }>('/push/test', { method: 'POST', token });
    return (res?.sent ?? 0) > 0;
  } catch {
    return false;
  }
}
