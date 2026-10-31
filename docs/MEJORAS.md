# NutriFit — Plan de mejoras para OpenCode

> Uso: guarda este archivo en el repo (`docs/MEJORAS.md`) y pide a OpenCode: *"Lee docs/MEJORAS.md y ejecuta la Fase 0. Después espera mi OK para la Fase 1."* Ejecuta **una fase por sesión** para no saturar el contexto.

---

## 0. Contexto y reglas de trabajo

**Proyecto:** tienda de suplementos `nutrifitsuplementos.cl` (NutriFit SpA, Santiago de Chile). Parece Next.js (imágenes servidas por `/_next/image`). Venta por WhatsApp con entrega en estaciones de Metro o a domicilio (Blue Express). Pago: efectivo o transferencia contra entrega. Cliente típico: móvil (iPhone, 5G), compra rápida.

**Reglas (obligatorias):**
1. Explora el repo antes de editar. No asumas estructura ni stack; confírmalos y documéntalos en `docs/AUDIT.md`.
2. No inventes datos (stock, reseñas, precios, políticas). Si falta un dato, crea el campo en el modelo de datos, deja un `TODO(dueño)` y no muestres el elemento en UI.
3. No cambies precios, descuentos ni stock reales sin confirmación. Todo valor de negocio va a `siteConfig` (un solo archivo) y no queda hardcodeado en componentes.
4. Lo marcado **[DECISIÓN DEL DUEÑO]** se implementa detrás de un flag/config con el valor actual como default, y se lista en `docs/AUDIT.md`. No decidas por él.
5. Copy en español de Chile (es-CL), tono directo. Tipografía correcta: `’`, `“ ”`, `·`; UTF-8 en todo.
6. Mobile-first: valida siempre en 390×844 y luego en 1280×800.
7. Un commit por tarea (`fix(checkout): …`), `lint` + `build` + tests deben pasar antes de cada commit.
8. Al terminar cada fase, entrega: resumen, archivos tocados, capturas antes/después (Playwright) y pendientes.

---

## Fase 0 — Reconocimiento (sin cambios de código)

- [x] Identificar: framework y versión, gestor de paquetes, estilos (¿Tailwind?), dónde viven catálogo, packs/sets, reseñas, carrito, checkout, layout, footer, FAQ, SEO/metadata.
- [x] Mapear el modelo de datos de producto (campos: precio, precio anterior, stock, imágenes, reseñas, categoría, sabores) y de packs.
- [x] Listar imágenes en `public/img` con peso, formato y dónde se usan.
- [x] Medir línea base: Lighthouse móvil (LCP, CLS, INP, peso total) en home, catálogo, ficha y carrito.
- [x] Generar `docs/AUDIT.md` con lo anterior + lista de decisiones pendientes (sección 6).

**Resultado:** ver `docs/AUDIT.md`. Fase cerrada sin cambios de código de producto.

---

## Fase 1 — P0: errores y confianza

> **Estado: cerrada en la rama `fix/fase-1`** (commits `9a06b80`…`9b5169e`).
> 1.1, 1.2, 1.3, 1.5, 1.6 y 1.7 implementadas y verificadas. 1.4 queda **solo
> como reporte** (`docs/claims-review.md`) a la espera de la decisión del dueño.
> Bitácora y pruebas en `docs/estado.md`.

**1.1 Imágenes de packs incorrectas** — ✅ hecho
- Hoy: "Pack Proteína + Creatina + Shaker" y "Set Masa + Fuerza" muestran solo el pote de whey (`producto1.webp`); "Set Bienestar" (omega 3 + berberina) muestra óxido nítrico; "Set Pump Total" parece mostrar creatina (posible desfase de índices en el mapeo).
- Hacer: cada pack/set muestra la composición real (imagen de cada componente con "+", como el hero). Si falta foto del shaker u otro componente, deja placeholder neutro y lístalo en `docs/AUDIT.md`.
- Aceptación: ningún pack usa la imagen de un producto que no contiene; test que verifica que cada componente del pack aparece en su visual.

**1.2 Conteo de reseñas engañoso** — ✅ hecho
- Hoy: "773 reseñas" en el pack hero = 617 (whey) + 156 (creatina FullEnergic), pero el pack lleva Eco Naturales (12 reseñas).
- Hacer: calcular desde datos reales del pack o del producto; si no hay dato propio, no mostrar conteo.
- Ocultar estrellas y nota cuando `reviewCount === 0` (hoy OstroVit y FNL Whey 947g muestran 4.9 con 0).

**1.3 Reseñas "Verificada"** — ✅ hecho
- Mostrar el chip solo si `verified === true` en los datos. Si no existe el campo, crearlo en `false` y quitar el chip hasta que el dueño confirme cómo se verifica.

**1.4 Claims de salud y testimonios [DECISIÓN DEL DUEÑO]** — ⏳ reporte entregado, falta decisión
- Escribir un script `scripts/scan-claims.ts` que recorra catálogo, sets, FAQ, hero y reseñas y genere `docs/claims-review.md` con cada texto que sugiera efecto terapéutico o resultado garantizado. Términos de partida: *colesterol, corazón, metabolismo, digestión, quemador, testo, "sin grasas", "rápido aumento muscular", "ayudó con"*, y similares.
- Implementar `reviewStatus: 'approved' | 'pending'` en reseñas y textos de sets. Default `pending` para los detectados; los `pending` no se renderizan.
- Reescribir solo el copy propio de los sets a descripción neutra de contenido (ej. "Omega 3 + Berberina"). No borres testimonios: quedan ocultos y listados.
- Nota: la normativa sanitaria chilena restringe declarar propiedades terapéuticas en suplementos; esto lo valida un abogado o asesor sanitario, no el código.

**1.5 Escasez y precios "antes"** — ✅ hecho
- "¡Solo quedan N unidades!" solo si existe `stock` real y `stock <= umbral` (umbral en `siteConfig`). Sin campo de stock: no mostrar.
- Mostrar precio tachado solo si `compareAtPrice > price` y el campo está marcado `compareAtVerified: true`. Crear el campo; default `false` ⇒ no se muestra tachado ni % de descuento. **[DECISIÓN DEL DUEÑO]**: confirmar qué precios "antes" son reales.
- Limitar la sección "En oferta" a máximo 8 productos con descuento verificado.

**1.6 Encoding roto** — ✅ hecho
- Footer: el tagline sale con caracteres de reemplazo (`U+FFFD`) en vez de «Nutrición · Energía · Resultados». Buscar `U+FFFD` y secuencias mojibake en todo el repo y en datos, corregir a UTF-8, confirmar `<meta charset>` y que los archivos estén guardados en UTF-8. Texto final: `Nutrición · Energía · Resultados`.

**1.7 Promesas inconsistentes → una sola fuente de verdad** — ✅ hecho
- Centralizar en `siteConfig`: `deliveryPromise`, `warrantyPolicy`, `paymentMethods`, `deliveryFees`, `businessHours`.
- Corregir: hero dice "entrega hoy" y el FAQ "24–48 hrs"; la garantía aparece como "devolvemos tu dinero, sin preguntas", "cambios garantizados" y "solo productos sin abrir". **[DECISIÓN DEL DUEÑO]** texto único; propuesta por defecto: *"Garantía de 10 días en productos sin abrir y con sello intacto."*
- Reemplazar el badge "Pago seguro" por "Pago contra entrega o transferencia" mientras no exista pasarela online.

---

## Fase 2 — P1: checkout y conversión

> **Estado: cerrada en la rama `fix/fase-2`** (a la espera de revisión).
> 2.1, 2.2 y 2.4 implementadas y verificadas. 2.3 queda **parcial**: chips de pago y
> tarifa visible antes del carrito, sin el selector de domicilio (F-06 sigue pendiente de
> decisión). 2.5 implementada como aviso de ahorro, sin aplicar el precio de pack.
> 2.6, 2.7 y 2.8 no iniciadas. Bitácora y pruebas en `docs/estado.md`.

**2.1 Validación visible** — ✅ hecho
- Al tocar "Enviar pedido" con campos vacíos o inválidos: errores en línea bajo cada campo y scroll + focus al primer error. Hoy el botón está visible pero el formulario queda fuera de pantalla.
- Labels reales (no solo placeholders), `inputMode="tel"`, `autocomplete="name"` / `"tel"`, validación de teléfono chileno (`9 XXXX XXXX`).

**2.2 Estructura del carrito** — ✅ hecho
- Dividir en dos bloques claros: "1 · Tu pedido" y "2 · Tus datos". Resumen de total fijo abajo.
- Reducir el recuadro grande de 4 íconos de confianza (ocupa media pantalla): dejar solo la fila pequeña inferior.
- Cupón colapsado: link "¿Tienes un cupón?" que despliega el campo.

**2.3 Pago y entrega** — ⏳ parcial
- Mostrar los medios de pago (efectivo / transferencia) como chips **arriba** del formulario, no en letra chica al final.
- Selector de método de entrega **Metro / Domicilio** con campos condicionales: Metro ⇒ Línea + Estación (Estación dependiente de la Línea); Domicilio ⇒ dirección + comuna. Verificar si el domicilio hoy existe en el formulario; en las capturas solo aparecen Línea y Estación.
- La tarifa debe verse **antes** del carrito: hoy "Entrega en metro $1.000" aparece solo al final. Mostrarla en hero, ficha y FAQ desde `siteConfig.deliveryFees`. **[DECISIÓN DEL DUEÑO]** cobrarla, absorberla o hacerla gratis desde cierto monto.

**2.4 CTA y mensaje de WhatsApp** — ✅ hecho
- Texto del botón: **"Enviar pedido por WhatsApp"** (hoy "Finalizar compra" promete más de lo que hace).
- El mensaje prellenado debe incluir: productos, sabores, cantidades, subtotal, tarifa, total, método de entrega (estación o dirección), método de pago y nombre. Usar `encodeURIComponent`; test que valida el formato de la URL `wa.me`.

**2.5 Venta cruzada con lógica** — ⏳ parcial
- Hoy "Completa tu pedido" ofrece otra proteína (vegana $18.000, FNL Woman $48.000) a quien ya lleva whey.
- Reglas: excluir categorías ya presentes en el carrito y ofrecer complementarios (whey ⇒ creatina; creatina ⇒ whey; óxido nítrico ⇒ L-citrulina; etc.), ordenados por precio ascendente y por margen si existe el dato.
- Si el carrito tiene whey + creatina, detectar el pack y mostrar el ahorro ("Ahorras $2.500"). **[DECISIÓN DEL DUEÑO]** aplicar el precio de pack automáticamente.

**2.6 Barra de descuento por monto [DECISIÓN DEL DUEÑO]**
- Hoy: "Te faltan $44.000 para un 5%" ⇒ umbral de $60.000, ~4× el ticket típico. Mover umbral y % a `siteConfig` manteniendo el valor actual; documentar la alternativa de un umbral cercano (ej. $35.000) o de "entrega gratis".

**2.7 Pasarela de pago (scaffold, apagado por defecto)**
- Flag `NEXT_PUBLIC_ENABLE_ONLINE_PAYMENT=false`. Preparar la interfaz para Webpay Plus, Mercado Pago o Flow (adaptador + ruta API + página de resultado) sin activar nada. Documentar credenciales necesarias. No guardar secretos en el repo.

**2.8 Registro del pedido antes de abrir WhatsApp**
- Persistir la intención de pedido (ruta API → base de datos, Google Sheet o email) antes de redirigir. Permite medir abandono y recuperar pedidos que no se enviaron por chat. Sin PII en analytics.

---

## Fase 3 — P1/P2: UI y visual

**3.1 Botón flotante de WhatsApp**
- Hoy tapa texto del hero, reseñas y nombres de producto. Reducir a ~48 px, quitar el pulso permanente, subirlo sobre la barra inferior fija (`bottom: calc(env(safe-area-inset-bottom) + alturaBarra + 12px)`), ocultarlo al hacer scroll hacia abajo y cuando el carrito o el menú estén abiertos.

**3.2 Barra inferior fija del pack hero**
- Hoy ofrece "Agregar" el pack hero en toda la home, incluso viendo otros productos. Mostrarla solo cuando el CTA del hero esté fuera de pantalla **y** el usuario esté en el hero/sección de packs (IntersectionObserver). En otras secciones, ocultarla.

**3.3 Grilla de categorías**
- El texto va sobre fotos con degradado y es ilegible. Rediseñar: imagen limpia arriba, título y descripción sobre fondo sólido abajo. Contraste mínimo 4.5:1.

**3.4 Imágenes y carga**
- `next/image` con `sizes` reales (ej. `(max-width: 768px) 50vw, 25vw`) en vez de pedir `w=3840`; `priority` solo en la imagen LCP del hero.
- Skeleton con `aspect-ratio` fijo o `placeholder="blur"` para evitar tarjetas vacías al hacer scroll (hoy se ven recuadros gris-azulados sin foto).
- Convertir `png`/`jpg` a `webp`/`avif`; renombrar sin espacios (`creatina full energic 300g.png` → `creatina-fullenergic-300g.webp`) y actualizar referencias. Meta: miniaturas < 80 KB.

**3.5 Sistema de color**
- Tokens CSS: **verde = acción primaria**; **naranja = solo descuento/urgencia** (badges); un único color de estrellas (amarillo). Cambiar a verde el botón del carrito en tarjetas de catálogo y los botones "+" de venta cruzada (hoy naranjas).

**3.6 Tarjetas de producto (2 columnas móvil)**
- Máximo 1 badge sobre la foto (prioridad: descuento > más vendido). "5 SABORES" pasa a texto bajo la imagen. Nombre en 2 líneas (`line-clamp-2`) para no cortar "Vegan Protein…" ni "Rain Óxido Nítri…".

**3.7 Fotos homogéneas**
- Contenedor `aspect-square`, `object-contain`, padding y fondo uniforme. Generar en `docs/AUDIT.md` la lista de productos cuya foto no cumple (fondo, resolución o encuadre) para que el dueño las reemplace.

**3.8 Contraste y animaciones**
- Auditar con axe/Lighthouse los textos grises (microcopy de confianza, "por porción", notas bajo el botón) y las etiquetas verde pálido ("SETS Y PACKS"). Ajustar a AA.
- Animaciones de aparición ≤ 300 ms, que los encabezados no queden semitransparentes durante el scroll, y respetar `prefers-reduced-motion`.

**3.9 Longitud de la home**
- Deduplicar: un producto aparece una sola vez por sección y, si es posible, una sola vez en toda la home (la creatina hoy aparece 3+ veces). Reducir secciones o convertir "Top ventas / En oferta / Nuevos" en una sola con pestañas.

---

## Fase 4 — SEO, técnico, legal y medición

**4.1 Metadatos:** unificar `<title>` y `og:title`; description única por página; canonical por producto y categoría.

**4.2 Datos estructurados (JSON-LD):** `Organization`, `WebSite`, `LocalBusiness` (Santiago, horario L–S 10:00–20:00), `Product` con `offers`, `FAQPage`. `aggregateRating` solo con reseñas reales y verificadas.

**4.3 Indexación:** `sitemap.xml` y `robots.txt` generados; rutas limpias para categorías (`/productos/proteinas` en vez de `?cat=`). La búsqueda del dominio no devolvió ninguna de sus páginas: verificar indexación.

**4.4 Rendimiento (metas en móvil):** LCP < 2.5 s, CLS < 0.1, INP < 200 ms. `next/font` con `display: swap`, lazy-load bajo el fold, recortar JS no usado.

**4.5 Accesibilidad:** `alt` en todas las imágenes, `aria-label` en botones solo-ícono (carrito, "+", favoritos, cerrar), áreas táctiles ≥ 44 px, `focus-visible`, orden de tabulación del carrito, `aria-live` para errores del formulario.

**4.6 Analytics (sin PII):** eventos `view_item`, `add_to_cart`, `begin_checkout`, `whatsapp_click`, `order_intent_saved`. Dashboard mínimo de embudo: home → ficha → carrito → envío.

**4.7 Páginas legales** (`/legal` con anclas ya enlazadas en el footer): políticas de envío, cambios y devoluciones, términos, privacidad. Incluir razón social NutriFit SpA y datos de contacto. Marcar `TODO(abogado)`: derecho a retracto en compras a distancia (Ley 19.496) y plazos de garantía; el texto final lo valida un abogado.

---

## Fase 5 — Verificación y cierre

- [ ] Tests e2e (Playwright): home → agregar producto → carrito → validación → URL de WhatsApp correcta; viewport 390×844.
- [ ] Capturas antes/después de: home, catálogo, ficha, carrito, menú.
- [ ] Lighthouse móvil: comparar con la línea base de la Fase 0.
- [ ] `docs/AUDIT.md` actualizado: cambios hechos, archivos tocados, decisiones pendientes.
- [ ] Descripción de PR por fase.

---

## 6. Decisiones pendientes del dueño (no implementar sin respuesta)

| # | Decisión | Default mientras tanto |
|---|----------|------------------------|
| 1 | Qué precios "antes" son reales | No mostrar tachado ni % |
| 2 | Qué testimonios/claims se mantienen | Ocultar los detectados |
| 3 | Tarifa de entrega en Metro ($1.000): cobrar, absorber o gratis desde monto | Se mantiene $1.000, visible desde el hero |
| 4 | Umbral y % del descuento por monto | Se mantiene $60.000 / 5 % en `siteConfig` |
| 5 | Texto único de garantía | "10 días, productos sin abrir y con sello intacto" |
| 6 | Aplicar automáticamente el precio de pack (whey + creatina) | No aplicar; solo mostrar ahorro |
| 7 | Pasarela de pago (Webpay, Mercado Pago o Flow) | Scaffold apagado |
| 8 | Cómo se verifica una reseña | Chip "Verificada" oculto |

## 7. Tareas manuales (fuera del código)

- Google Search Console: enviar sitemap y revisar cobertura.
- Google Business Profile: completar ficha y reseñas (las reseñas de Google que enlazas deberían aparecer en la búsqueda de marca).
- Marca: verificar registro y conflictos del nombre "NutriFit" en INAPI (existen otras marcas "Nutrifit").
- Reemplazar fotos de producto no homogéneas (lista generada en la Fase 3.7).
- Revisión legal de claims, retracto/garantía y términos.
