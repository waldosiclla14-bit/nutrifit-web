/// ── Cookie constants ──────────────────────────────────────────────
// HttpOnly cookie que el navegador pone automáticamente.
// JavaScript NO puede leerla → protege contra XSS.
export const ACCESS_TOKEN_COOKIE = 'access_token'
// Flags recomendados para producción (ajustar .env según hosting):
//   secure: solo enviarlo por HTTPS (obligatorio en producción)
//   sameSite: 'strict' o 'lax' para evitar CSRF cross-site
//   maxAge: tiempo en segundos que la cookie vive (7 días por defecto)
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // producción = true; desarrollo = false (http local)
  sameSite: 'lax' as const, // 'strict' es más restrictivo, 'lax' permite navegación cross-site segura
  path: '/', // disponible en todo el dominio
  // maxAge: 60 * 60 * 24 * 7, // 7 días (opcional: se puede setear al setCookie)
}