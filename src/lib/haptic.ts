export function haptic(ms = 30) {
  try { navigator.vibrate?.(ms); } catch {}
}
