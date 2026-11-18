# Auditoría de percepción de marca y conversión — NutriFit

| Campo | Detalle |
|---|---|
| Cliente | NutriFit SpA — suplementos deportivos, Santiago de Chile |
| URL auditada | https://nutrifitsuplementos.cl |
| Fecha | 14 de noviembre de 2026 |
| Tipo | Auditoría completa (14 secciones) + revisión de código del storefront |
| Modelo de negocio | E-commerce con checkout por WhatsApp (retiro en Metro / envío a domicilio) |
| Plataforma | Next.js 16 (App Router) a medida, backend NestJS + Prisma |
| Auditor | Transforming Store's |

**Score global: 67 / 100 — "Mitad del camino"**
3 hallazgos P0 · 12 hallazgos P1 · 6 hallazgos P2

---

## 1. Resumen ejecutivo

NutriFit ya tiene una base de marca por encima del promedio: identidad visual consistente, tipografía propia, fotografía de producto limpia, buena arquitectura de home, SEO técnico sólido y un flujo de carrito con upsells. No es un sitio "genérico": se percibe una tienda real.

Lo que frena ventas hoy no es el diseño, sino tres grietas de operación y confianza:

1. **Se promete envío a domicilio en todo el sitio, pero el checkout solo permite retiro en Metro.** El formulario exige línea y estación, y el código fija `deliveryMethod: 'metro'`. Un cliente que quiere envío a su casa no puede completar el pedido.
2. **No hay analítica ni píxel activos en producción.** No existe `gtag`, `dataLayer` ni `fbq`; GA4 y Meta Pixel están implementados pero sin variables de entorno. Cualquier inversión en tráfico o ads opera a ciegas.
3. **El catálogo, precios y stock del storefront están hardcodeados** en `src/data/seed.ts`. Lo que se edite en el admin/Prisma no se refleja en la web: riesgo de precio desactualizado, sobreventa y sitemap obsoleto.

Frase de apertura: *"Tu sitio tiene un 67% de las señales que hacen ver una marca profesional. Lo que más te está costando ventas hoy es que prometes entrega a domicilio pero el checkout solo acepta Metro, y que no estás midiendo ninguna conversión."*

---

## 2. Desglose de score

| Sección | Puntos | Resultado | Peso | Subtotal |
|---|---|---|---|---|
| 1. Primera impresión | 4/5 | 80 | 12 | 960 |
| 2. Tipografía y jerarquía | 4/4 | 100 | 7 | 700 |
| 3. Fotografía y contenido visual | 2,5/5 | 50 | 9 | 450 |
| 4. Navegación y estructura | 3,5/4 | 87,5 | 7 | 612,5 |
| 5. Señales de confianza | 3/5 | 60 | 10 | 600 |
| 6. Página de producto | 3,5/5 | 70 | 10 | 700 |
| 7. Conversión | 3/6 | 50 | 10 | 500 |
| 8. Mobile | 2,5/4 | 62,5 | 9 | 562,5 |
| 9. Panel / operación | 1,5/5 | 30 | 5 | 150 |
| 12. Movimiento e interactividad | 6/10 | 60 | 9 | 540 |
| 13. SEO | 8/10 | 80 | 7 | 560 |
| 14. Accesibilidad | 5/7 | 71,4 | 5 | 357 |
| **Total** | | | **100** | **66,9 → 67** |

**Dónde se pierde el puntaje:** operación (30), conversión (50), fotografía (50) y confianza (60). El diseño y el SEO ya están en nivel "sólido".

---

## 3. Hallazgos priorizados

### P0 — Críticos

| # | Sección | Hallazgo | Evidencia | Impacto | Fix propuesto | Esfuerzo |
|---|---|---|---|---|---|---|
| 1 | 7.1 / 7.2 / 9.3 | **Envío a domicilio prometido pero no disponible en checkout.** El carrito solo pide línea y estación de Metro; `checkout()` exige `metroLine`/`metroStation` y guarda `deliveryMethod: 'metro'` fijo. | TopBar, hero, FAQ, ficha y legal prometen domicilio con Blue Express; `CartDrawer.tsx:175,200`; campos del carrito: solo Línea/Estación. | Pierde a todo cliente que prefiere domicilio o vive fuera de la cobertura Metro. Es la fuga de conversión más grande. | Selector "Metro / Domicilio" en el carrito; dirección + comuna; tarifas S/M ya existen en `api.ts` (`ENVIO_DOMICILIO`) y en el JSON-LD. Validar campos por método. | 1–2 días |
| 2 | 9.4 / 9.5 | **Sin tracking de conversión en producción.** GA4 y Meta Pixel están implementados pero no se ejecutan. | En vivo: `typeof gtag === "undefined"`, `typeof fbq === "undefined"`, sin script de Google/Meta, sin cookies `_ga/_fbp`. `GA4.tsx` y `MetaPixel.tsx` dependen de variables de entorno ausentes. | Sin atribución, sin audiencias, sin optimización de campañas; el negocio no puede saber qué canal vende. | Configurar `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_META_PIXEL_ID` en Vercel; agregar evento `purchase`/`Lead` al finalizar por WhatsApp; sumar consentimiento de cookies. | 0,5–1 día |
| 3 | 9.1 / 9.3 / 13.5 | **Catálogo hardcodeado y desconectado del admin.** El storefront lee `PRODUCTS` desde `src/data/seed.ts` en 32 archivos (home, catálogo, ficha, sitemap, carrito). | Precios, stock, badges y reseñas viven en el seed; el admin escribe en Prisma. | Editar un precio o stock en el panel no cambia la web. Riesgo de vender a precio viejo, sobreventa y productos nuevos fuera del sitemap. | Consumir productos desde la API/DB con ISR (`revalidate`) o sincronizar el seed desde Prisma en build. Mantener el seed solo como fallback. | 3–5 días |

### P1 — Medianos

| # | Sección | Hallazgo | Evidencia | Fix propuesto | Esfuerzo |
|---|---|---|---|---|---|
| 4 | 6.3 / 12.3 | **El botón "Comprar por WhatsApp" del hero no abre WhatsApp:** agrega el pack al carrito (`onClick={addPack}`). | `HeroSection.tsx:218-225`; probado en vivo: al pulsar se abre el carrito, no WhatsApp. | Reutilizar `orderViaWhatsApp` como en la ficha de producto, o renombrar el CTA a "Agregar al carrito". | 15 min |
| 5 | 6.5 | **"Más vendido" en 32 de 33 productos.** El badge pierde todo significado y simula urgencia. | `bestseller: true` en 32 productos del seed; el catálogo muestra 32 badges "MÁS VENDIDO". | Dejar el badge a 3–5 productos con ventas reales; usar "Nuevo" / "Oferta" para el resto. | 1 h + curaduría |
| 6 | 5.1 / 13.3 | **Conteo de reseñas inconsistente y sin verificación.** Hero: 629; card: 617; ficha: 132; schema: 617. Los 10 testimonios están hardcodeados, con iniciales y sin foto, presentados junto a "Reseñas de Google". | Home y ficha en vivo; `UGCProof.tsx` (reseñas estáticas); JSON-LD `reviewCount: 617`. | Unificar el número (variante vs. producto vs. total), conectar reseñas reales de Google o marcar los testimonios como "clientes NutriFit", y agregar foto/compra verificada. | 4–8 h |
| 7 | 14.1 | **Contraste insuficiente del verde de marca.** Blanco sobre `#72BF44` = 2,26:1; verde sobre blanco = 2,26:1; gris `#9CA3AF` sobre blanco = 2,53:1. Afecta CTAs principales, badges y textos secundarios. | Lighthouse: 13+ nodos con contraste bajo, incluidos los dos CTAs del hero. | Oscurecer el verde para texto/CTA (≥4,5:1) o usar texto oscuro sobre verde; subir grises a `gray-500/600` en textos pequeños. | 4–8 h |
| 8 | 7.5 / 7.6 | **No hay captación de email ni integración de email marketing.** El footer no tiene newsletter y no se ofrece ningún lead magnet. | Footer completo; no hay formulario de email en el sitio. | Agregar captación (ej. "Guía de suplementos" o 5% OFF) integrada a Klaviyo/Mailchimp, con consentimiento. | 0,5–1 día |
| 9 | 4.1 / 4.4 | **Dos enlaces de navegación rotos:** "Combos" apunta a `/#combos` (la sección tiene `id="sets"`) y "Opiniones" a `/#opiniones` (la sección de reseñas no tiene id). | `Header.tsx:15-16`, `Footer.tsx:52,54`, `Packs.tsx:30`, `UGCProof.tsx` sin id. | Corregir anclas a `#sets` y agregar `id="opiniones"` a UGCProof. | 30 min |
| 10 | 13.9 / 5.4 | **Blog con contenido delgado y sin ruta a la compra.** El artículo de creatina declara "7 min de lectura" pero tiene ~880 caracteres, sin autor, fuentes ni imágenes, y su único enlace es "Volver al blog". | `/blog/creatina-guia-completa`: solo 1 enlace interno, 0 imágenes, 3 H2. | Ampliar a 900–1.500 palabras con fuentes, autor y CTA a los productos; enlazar desde cada artículo al pack correspondiente. | 1–2 días |
| 11 | 6.1 | **Ficha de producto con una sola imagen.** No hay galería de 4+ ángulos; el cambio de sabor reemplaza la imagen, no suma. | Ficha de whey: 1 imagen principal visible + imágenes de sets/productos relacionados. | Sumar 4–6 fotos por producto: frente, reverso, tabla nutricional, textura, producto en uso. | 1 día + producción |
| 12 | 3.2 / 5.4 | **Sin fotografía de contexto real.** No hay fotos del equipo, del local, de entregas en Metro ni de clientes; "Sobre nosotros" es solo texto. | Home y `/sobre-nosotros` sin imágenes propias de contexto. | Producir 5–8 fotos reales (entregas, estación, preparación de pedidos, equipo) y usarlas en home/about. | Producción |
| 13 | 3.5 | **Sin video ni GIF** en home ni en ficha. | No hay `<video>` ni GIF en el sitio. | Video corto (10–15 s) de producto/entrega en el hero o en la ficha. | Producción |
| 14 | 7.3 / 12.6 | **Validación del checkout solo al enviar.** El error "Completa tu nombre y teléfono" aparece recién al pulsar el botón y sin `aria-live`; no hay feedback por campo. | `CartDrawer.tsx:165-178`; probado en vivo con campos vacíos. | Validación inline al salir del campo, mensajes asociados con `aria-describedby` y `role="alert"`. | 2–4 h |
| 15 | 1.4 / 8.1 | **En mobile/tablet la propuesta de valor queda bajo el pliegue:** la columna de imagen va primero (`order-1`) y el H1 recién aparece después del pack visual. | A 800×527 el H1 está en y≈542, fuera del viewport; en 375 px se acentúa. | En mobile, poner texto y CTA primero (o superponer el titular sobre la imagen) para que el visitante entienda la oferta en 3 segundos. | 2–4 h |
| 16 | 4.4 / 5.3 | **Footer sin dirección, RUT ni métodos de pago.** Solo "Santiago, Chile"; los medios de pago aparecen únicamente dentro del carrito. | `Footer.tsx`; legal sin dirección comercial. | Agregar dirección/región, RUT, y "Efectivo / Transferencia" visibles en footer. | 1 h |

### P2 — Pulido

| # | Sección | Hallazgo | Fix |
|---|---|---|---|
| 17 | 14.7 / 2.2 | Lighthouse marca orden de encabezados: `<h4>` en footer sin `<h3>` previo. | Cambiar los títulos del footer a `<h3>` o `<p>` estilizado. |
| 18 | Copy | Errores de redacción: "quedaré-cliente fija", "La pre-entreno… potentísima", "BCAAS". | Revisión de copy en testimonios y ficha. |
| 19 | 14.6 | `lang="es"` en lugar de `es-CL`. | Ajustar el atributo del `<html>`. |
| 20 | 13.3 | Falta `BreadcrumbList` en JSON-LD aunque el breadcrumb visual existe. | Agregar schema de migas. |
| 21 | 12.4 / 12.5 | No hay contadores animados ni transiciones de página; el scroll-reveal es el mismo efecto en todas las secciones. | Count-up en métricas (porciones, estaciones, garantía) y transición suave entre rutas. |
| 22 | 8.x | No se pudo emular viewport móvil real en esta sesión; el menú y los targets táctiles se revisaron por código (h-10/11/14, menú con búsqueda y categorías). | QA manual en iPhone/Android antes de cerrar. |

---

## 4. Checklist completo

### 1. Primera impresión — 4/5 (80)
- ✅ 1.1 Hero con fotografía de producto propia, no stock.
- ✅ 1.2 Logo tipográfico nítido (sin imagen pixelada).
- ✅ 1.3 Tipografía con intención (Bebas Neue + Inter).
- ❌ 1.4 Propuesta de valor bajo el pliegue en mobile/tablet.
- ✅ 1.5 Paleta consistente (verde lima, negro, blanco, naranja de oferta).

### 2. Tipografía y jerarquía — 4/4 (100)
- ✅ 2.1 Dos familias máximo.
- ✅ 2.2 Jerarquía H1/H2/H3 clara.
- ✅ 2.3 Interlineado y espaciado generosos.
- ✅ 2.4 Tono deportivo y bold coherente con la marca.

### 3. Fotografía y contenido visual — 2,5/5 (50)
- ⚠️ 3.1 Fotos de producto consistentes en su mayoría, pero conviven recortes y fondos de distinto origen.
- ❌ 3.2 Sin foto de contexto real (equipo, entrega, uso).
- ✅ 3.3 Sin marcas de agua.
- ✅ 3.4 Iconografía Lucide consistente + iconos de marca puntuales.
- ❌ 3.5 Sin video/GIF.

### 4. Navegación y estructura — 3,5/4 (87,5)
- ✅ 4.1 Menú de 5 secciones + categorías/objetivos.
- ✅ 4.2 Buscador funcional con resultados en vivo.
- ✅ 4.3 Breadcrumbs en ficha de producto.
- ⚠️ 4.4 Footer completo en enlaces, pero sin dirección, RUT ni medios de pago; dos anclas rotas.

### 5. Señales de confianza — 3/5 (60)
- ⚠️ 5.1 Testimonios con nombre e iniciales, sin foto ni verificación; hardcodeados.
- ✅ 5.2 Políticas de entrega, términos, privacidad y garantía accesibles.
- ⚠️ 5.3 Sellos propios ("100% originales", "garantía 10 días"), sin certificaciones ni logos de pago.
- ✅ 5.4 "Sobre nosotros" con historia real (aunque sin imágenes).
- ❌ 5.5 Sin prensa, certificaciones ni alianzas visibles.

### 6. Página de producto — 3,5/5 (70)
- ❌ 6.1 Una sola imagen, sin galería de 4+.
- ✅ 6.2 Descripción con beneficios y modo de uso.
- ✅ 6.3 CTA principal diferenciado (verde lleno) + WhatsApp outline.
- ✅ 6.4 Relacionados y sets curados por categoría.
- ⚠️ 6.5 Sin indicador de stock real; "Más vendido" masivo resta credibilidad.

### 7. Conversión — 3/6 (50)
- ⚠️ 7.1 Carrito propio con marca, pero el cierre ocurre en WhatsApp (sin checkout propio).
- ✅ 7.2 Costos de entrega y total visibles antes de confirmar.
- ✅ 7.3 Pop-up de bienvenida solo desktop, tras 6 s y por exit-intent.
- ⚠️ 7.4 Velocidad no medida con PageSpeed (API limitó la consulta); carga local observada rápida.
- ❌ 7.5 Sin captación de email.
- ❌ 7.6 Sin integración con email marketing.

### 8. Mobile — 2,5/4 (62,5)
- ⚠️ 8.1 Menú mobile implementado; no se pudo validar en viewport real.
- ✅ 8.2 Targets táctiles de 40–56 px.
- ⚠️ 8.3 Imágenes responsive vía `next/image`; sin QA visual móvil.
- ⚠️ 8.4 Flujo de compra no probado de punta a punta en dispositivo; además falta domicilio.

### 9. Panel / operación — 1,5/5 (30)
- ✅ 9.1 Catálogo ordenado y filtros funcionales.
- N/A 9.2 Sin stack de plugins (sitio a medida).
- ❌ 9.3 Precios/stock hardcodeados en el frontend.
- ❌ 9.4 Sin GA4/Meta Pixel activos.
- ❌ 9.5 Imposible conciliar ingresos con analítica (no hay analítica).
- N/A 9.6–9.9 Roles, 2FA, accesos y reportería no auditables desde el sitio público.
- ⚠️ 9.10 Velocidad no medida con PageSpeed en esta sesión.

### 12. Movimiento e interactividad — 6/10 (60)
- ✅ 12.1 Hero animado (entradas escalonadas, cambio de sabor).
- ✅ 12.2 Scroll-reveal en secciones.
- ✅ 12.3 Hover/press en CTAs.
- ❌ 12.4 Sin contadores animados.
- ⚠️ 12.5 Sin transiciones de página personalizadas.
- ❌ 12.6 Sin validación en tiempo real.
- ⚠️ 12.7 Animaciones con transform/opacity (buenas), pero CLS no medido.
- ✅ 12.8 Intensidad variada.
- ✅ 12.9 Movimiento con propósito.
- ❌ 12.10 Sin prueba en mobile con red lenta.

### 13. SEO — 8/10 (80)
- ✅ 13.1 Meta title/description únicos por página.
- ✅ 13.2 Un solo H1 por página.
- ⚠️ 13.3 JSON-LD de Organization, Product, BlogPosting y Store; falta BreadcrumbList y el `reviewCount` no coincide con la ficha.
- ✅ 13.4 Alt text descriptivo.
- ✅ 13.5 `robots.txt` y `sitemap.xml` presentes (sitemap estático desde el seed).
- ✅ 13.6 Canonical correcto.
- ✅ 13.7 URLs limpias.
- ⚠️ 13.8 Search Console no verificable desde esta auditoría.
- ⚠️ 13.9 Enlazado interno correcto en producto, débil en blog.
- ⚠️ 13.10 Core Web Vitals no medidos en campo.

### 14. Accesibilidad — 5/7 (71,4)
- ❌ 14.1 Contraste insuficiente (2,26:1 en CTAs y verde; 2,53:1 en grises).
- ⚠️ 14.2 Foco visible en CTAs principales, no generalizado en enlaces.
- ✅ 14.3 Recorrido principal operable por teclado.
- ✅ 14.4 Botones icono con `aria-label`.
- ✅ 14.5 Formularios con labels/aria-label.
- ✅ 14.6 `lang="es"` correcto (mejorable a `es-CL`).
- ⚠️ 14.7 Lighthouse: Accesibilidad 95, SEO 100, Best Practices 100; fallan contraste y orden de headings.

---

## 5. Propuesta de transformación

| Paquete | Alcance | Tiempo | Cambio percibido |
|---|---|---|---|
| **Quick wins** | Hero WhatsApp, anclas rotas, badge "más vendido", contraste, copy, footer, conteo de reseñas, `lang`, schema de migas | 2–3 días | "Se siente cuidado y confiable" |
| **Transformación** | Selector domicilio/Metro, captación de email, galería 4–6 fotos, fotos reales, video, blog con CTA, validación inline, hero mobile | 2–3 semanas | "De tienda bonita a marca que vende" |
| **Reconstrucción** | Catálogo dinámico desde el admin, tracking + consentimiento, conciliación de pedidos | 1–2 semanas | "El negocio opera con datos, no a ciegas" |

**Orden recomendado:** P0 (domicilio, tracking, catálogo) → quick wins visuales → transformación de contenido/fotografía.

---

## 6. Notas y límites de la auditoría

- PageSpeed Insights respondió **429 (límite de cuota)** en los tres intentos; la velocidad no se midió con dato de campo. Se usó Lighthouse local para accesibilidad/SEO/best practices (95/100/100).
- No se emuló viewport móvil real; los puntos 8.x se evaluaron por código y responsive clases. Recomendado QA en dispositivo.
- El panel admin, roles y 2FA no forman parte de esta auditoría (solo storefront público).
- Los datos de reseñas y stock se verificaron contra el código y el sitio en vivo al 14-11-2026.

**Próximo paso:** agendar 20 minutos para recorrer el reporte y priorizar los 3 P0.
