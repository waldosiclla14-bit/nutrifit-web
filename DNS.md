# DNS — Conectar dominio a Vercel (NUTRIFIT)

Guía para conectar un dominio propio (p. ej. `nutrifitsuplementos.cl`) al proyecto
`nutrifit-web` en Vercel. El sitio se sirve actualmente en `https://nutrifit-web-nu.vercel.app`.

## 1. Agregar el dominio en Vercel

- Entra al dashboard de Vercel → proyecto **nutrifit-web** → **Settings → Domains**.
- Agrega **ambos**: el dominio raíz (`nutrifitsuplementos.cl`) y el subdominio
  `www.nutrifitsuplementos.cl`.
- La tarjeta del dominio te muestra los valores DNS exactos. **Usa siempre los valores
  de esa tarjeta**, no los genéricos de esta guía, por si el proyecto tiene valores
  propios (p. ej. IP anycast distinta o un CNAME específico).

## 2. Crear los registros DNS en tu registrador

Registros mínimos (dominio sin delegación de nameservers a Vercel):

| Tipo   | Nombre/Host | Valor                                          | TTL      |
| ------ | ----------- | ---------------------------------------------- | -------- |
| `A`    | `@` (apex)  | `76.76.21.21` (o el IP de tu tarjeta de dominio) | Auto/300 |
| `CNAME`| `www`       | `cname.vercel-dns.com` (o el target de tu tarjeta) | Auto/300 |

Recomendaciones:

- **No** uses CNAME en el apex (el DNS no lo permite junto a NS/SOA).
- **No** crees un A record para `www`; usa el CNAME.
- Si usas Cloudflare: pon los registros en modo **DNS only** (nube gris), sin proxy.
- Si el dominio tenía registros AAAA viejos o CAA restrictivos, elimínalos o ajusta
  el CAA para permitir a Let's Encrypt (`letsencrypt.org`).
- Si usas el apex para email (MX de Google Workspace/Fastmail), el A record de HTTP
  no entra en conflicto con MX, pero verifica que tu registrador no toque los MX al
  guardar cambios.

## 3. Redirección y SSL

- En **Settings → Domains**, marca `nutrifitsuplementos.cl` como **primary** y activa
  la redirección `www` → raíz (o la dirección que elijas como canónica).
  Consolidar una única variante evita contenido duplicado y reparte el SEO correctamente.
- Vercel emite y renueva el certificado SSL automáticamente (Let's Encrypt) una vez
  que el DNS apunta a Vercel (puede tardar unos minutos tras propagar).

## 4. Actualizar la URL del sitio en el código

`src/data/seed.ts` contiene `BRAND.url`, la única fuente de las URLs canónicas,
JSON-LD (WebSite/Store/Product/BlogPosting) y OpenGraph:

```ts
url: 'https://nutrifit-web-nu.vercel.app', // → 'https://nutrifitsuplementos.cl'
```

1. Cambia esa línea.
2. Commit + push a `main` (Vercel redeploya automáticamente).
3. Verifica en producción que `<link rel="canonical">`, sitemap y JSON-LD usen el dominio nuevo.

## 5. Verificar

- `dig nutrifitsuplementos.cl A +short` → debe devolver `76.76.21.21` (o tu IP).
- `dig www.nutrifitsuplementos.cl CNAME +short` → `cname.vercel-dns.com` (o tu target).
- Abrir el dominio en una ventana de incógnito y confirmar que carga y que el candado SSL aparece.

## Resolución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| "Domain is already in use" | El dominio está en otro proyecto de Vercel | Eliminarlo del otro proyecto o pedir acceso |
| SSL en "pending" | DNS aún no propaga o CAA bloquea Let's Encrypt | Esperar hasta 48 h; revisar CAA |
| Página de parking del registrador | La propagación de la eliminación no terminó | Revisar en incógnito; verificar registros |
| Redirecciones infinitas | Cloudflare proxy + Vercel SSL | Poner Cloudflare en DNS only |
