/**
 * Fuente única de URLs canónicas del proyecto.
 * Toda referencia al dominio (canonical, OG, sitemap, JSON-LD, enlaces
 * internos) debe salir de aquí. Override vía NEXT_PUBLIC_SITE_URL en .env.local.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://nutrifitsuplementos.cl'
).replace(/\/+$/, '');

export const SITE_HOST = new URL(SITE_URL).host;

/** Hosts antiguos (Vercel) que deben redirigir 301 al dominio canónico. */
export const LEGACY_HOSTS = ['nutrifit-web-nu.vercel.app'];

/** WhatsApp del negocio (número único, también usado en JSON-LD contactPoint). */
export const WHATSAPP_NUMBER = '56923883826';

/**
 * Title SEO único y siempre < 60 caracteres.
 * Ej: seoTitle('FNL Creatina Monohidratada 1kg – 200 porciones') =>
 * 'FNL Creatina Monohidratada 1kg – 200 porciones | NutriFit'
 */
export function seoTitle(base: string, max = 60): string {
  const suffix = ' | NutriFit';
  const clean = base.trim();
  if (clean.length + suffix.length <= max) return clean + suffix;
  const room = Math.max(0, max - suffix.length - 1);
  const cut = clean.slice(0, room).replace(/[\s,;:·–—-]+$/, '');
  return `${cut}…${suffix}`;
}
