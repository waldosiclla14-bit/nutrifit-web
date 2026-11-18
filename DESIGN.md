---
name: NutriFit Chile
description: Suplementos originales con entrega en el Metro de Santiago.
colors:
  brand-lime: "#72BF44"
  brand-lime-deep: "#3D6A20"
  brand-orange: "#F97316"
  ink: "#0B0B0B"
  sport-text: "#0F172A"
  sport-text-muted: "#64748B"
  sport-surface: "#F8FAFC"
  sport-border: "#E2E8F0"
  paper: "#FFFFFF"
  admin-surface: "#F7F7F5"
  admin-text: "#17171A"
  admin-muted: "#6B6B66"
typography:
  display:
    fontFamily: "Bebas Neue, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "0em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.25em"
rounded:
  control: "12px"
  card: "24px"
  pill: "9999px"
  tile: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  button-accent:
    backgroundColor: "{colors.brand-lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.sport-text}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  chip-filter:
    backgroundColor: "{colors.sport-surface}"
    textColor: "{colors.sport-text-muted}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-filter-active:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.sport-text}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  card-product:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.sport-text}"
    rounded: "{rounded.card}"
    padding: "20px"
---

# Design System: NutriFit Chile

## Overview

**Creative North Star: "El Etiquetado Deportivo"**

El sistema se comporta como la etiqueta de un suplemento: cada bloque declara qué es, cuánto rinde y de dónde viene, sin adornos que no informen. La densidad es deportiva, no editorial: bloque de producto grande, dato al lado del precio y la entrega visible antes de cualquier promesa. La energía viene de la tipografía condensada en mayúsculas y del verde limón usado como marcador, no de decoración.

El color es señalización, no atmósfera: verde para el sistema NutriFit, naranja para la acción y la urgencia comercial, tinta casi negra para el texto. Superficies blancas y gris frío hacen de mesa de laboratorio; nada de degradados de fondo ni glassmorphism.

La marca se expresa con dos gestos: Bebas Neue en mayúsculas para titulares y cifras, e Inter en pesos 800 para el resto de la jerarquía. La entrega en Metro se trata como dato duro del producto (chip/badge junto al precio), coherente con la metáfora de etiqueta.

**Key Characteristics:**
- Etiqueta antes que afiche: cada sección responde qué, cuánto y dónde.
- Verde limón como marcador y fondo; nunca como texto sobre blanco.
- Titulares condensados en mayúsculas; cuerpo en Inter.
- Cards con radio grande y borde fino; sombra solo al hover.
- Entrega y stock como datos visibles, no como letra chica.

## Colors

Paleta de señalización deportiva: un verde limón de alta luminosidad, un naranja de urgencia y neutros fríos casi sin tinte.

### Primary
- **Verde Marcador** (`#72BF44`): identidad y marcador. Fondos de badge, relleno de botón secundario, íconos, subrayados, sellos "original". **No se usa como color de texto sobre blanco** (2.27:1).
- **Verde Etiqueta** (`#3D6A20`): la versión legible del mismo verde para texto, íconos de texto y focus ring. 6.40:1 sobre blanco.

### Secondary
- **Naranja Acción** (`#F97316`): CTA primario, precio de oferta, badges de descuento, contadores. Es el color que pide la acción, no el que identifica la marca. Con texto de tinta alcanza 6.37:1; con blanco solo 2.80:1.

### Neutral
- **Tinta** (`#0B0B0B`): texto de máximo contraste en superficies claras y fondo de bloques oscuros.
- **Tinta Deportiva** (`#0F172A`): texto base de la tienda.
- **Gris Etiqueta** (`#64748B`): texto secundario, metadatos, labels. 4.76:1 sobre blanco.
- **Mesa** (`#F8FAFC`): superficie de secciones alternas y de inputs en reposo.
- **Borde Fino** (`#E2E8F0`): separadores y bordes de card.
- **Papel** (`#FFFFFF`): superficie base de la tienda.
- **Neutros de admin** (`#F7F7F5` / `#17171A` / `#6B6B66`): el panel y el POS usan una escala propia, más cálida y más densa que la tienda.

### Named Rules
**The Marcador Rule.** El verde limón se usa como fondo, borde o ícono. Cuando el verde es texto sobre blanco, cambia a Verde Etiqueta (`#3D6A20`). Nunca ambos en el mismo elemento.

**The Un Color de Acción Rule.** El naranja señala acción o ahorro. Si aparece en un bloque sin CTA ni descuento, sobra.

**The Tinta sobre Color Rule.** Todo texto sobre verde o naranja usa tinta (`#0B0B0B`/`#0F172A`), no blanco.

## Typography

**Display Font:** Bebas Neue (con Inter, ui-sans-serif, system-ui)
**Body Font:** Inter (con ui-sans-serif, system-ui)
**Label/Mono Font:** ninguna; el panel usa `font-mono` del sistema para códigos y cupones.

**Character:** Condensada y gritada arriba, neutral y exacta abajo. Bebas Neue aporta el grito de cancha en una sola palabra o cifra; Inter sostiene toda la información sin competir.

### Hierarchy
- **Display** (400, clamp 40–72px, line-height 0.95, mayúsculas, tracking 0.02em): titulares de hero, precios grandes, 404. Solo mayúsculas; nunca en párrafos.
- **Headline** (800, 28px → 36px, line-height 1.15): títulos de sección (`.section-title`).
- **Title** (800, 18px, line-height 1.3): nombre de producto, títulos de card y de drawer.
- **Body** (400/600, 14px, line-height 1.6): descripción, condiciones, legal. Máximo ~65ch en bloques largos.
- **Label** (600–800, 11–12px, mayúsculas, tracking 0.25em–0.28em, naranja o verde): etiquetas de sección y metadatos.

### Named Rules
**The Bebas Sin Negrita Rule.** Bebas Neue solo existe en peso 400; `font-synthesis-weight: none` está activo en `.font-display`. No simular negrita.

**The Dato en 3 Segundos Rule.** Si un número importa (precio, gramos, estaciones, descuento), va en display o en title con peso 800, nunca en body.

## Layout

Contenedor único `.container-px`: `max-w-7xl` centrado con `px-4 / sm:px-6 / lg:px-8`. Las secciones respiran con `py-16` en móvil y `py-24` en desktop; el ritmo vertical es de bloques completos, no de tarjetas sueltas.

La tienda es mobile-first de una columna; en desktop pasa a 2 columnas (hero, ficha de producto) y a 3–4 en grillas de catálogo (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`). El hero reserva la columna derecha para el producto y deja el texto a la izquierda, invirtiendo el orden en móvil (`order-2 lg:order-1`).

La ficha de producto usa dos columnas con la galería sticky a la izquierda y el bloque de compra a la derecha; en móvil colapsa en una sola columna con el CTA fijo abajo (`StickyBottomBar`).

El panel admin rompe la regla: densidad alta, `max-w` propio por vista, sidebar fija en desktop y `BottomNav` en móvil.

## Elevation & Depth

Sistema plano en reposo. La profundidad se comunica con borde fino (`#E2E8F0`) y cambio de superficie (`#FFFFFF` sobre `#F8FAFC`), no con sombra permanente. La sombra aparece como respuesta a estado: hover de card, hover de botón, drawer abierto.

### Shadow Vocabulary
- **Card en reposo** (`box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.4)`): solo en cards de producto destacadas y en superficies oscuras, donde el borde no alcanza.
- **Glow de marca** (`box-shadow: 0 14px 44px -16px rgba(114, 191, 68, 0.4)`): hover de CTA verde. Es la única sombra con color.
- **Elevación de overlay** (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`): drawer del carrito y modales.

### Named Rules
**The Flat-By-Default Rule.** Una card no lleva sombra hasta que el usuario la toca. Si una superficie necesita sombra para separarse, primero probar borde o cambio de fondo.

## Shapes

Lenguaje de etiqueta troquelada: radios grandes y bordes finos. Botones y chips son píldoras completas (`9999px`); cards usan `24px` (`rounded-3xl`); inputs `12px`; tiles de ícono `16px`. Los badges y sellos de descuento siempre son píldoras, incluso dentro de una card cuadrada — es la firma visual de la tienda.

El borde es de 1px y casi siempre semitransparente (`border-sport-border/50`, `--line: rgba(11,11,11,0.09)`). No hay esquinas mixtas ni cortes diagonales: nada de formas rotas.

## Components

### Buttons
- **Shape:** píldora completa (`9999px`), altura 48–56px, padding `14px 28px`, texto 14px peso 700, tracking amplio.
- **Primary:** fondo naranja (`#F97316`), texto tinta. Es "comprar / agregar".
- **Accent:** fondo verde (`#72BF44`), texto tinta. Es "ver catálogo / continuar".
- **Hover / Focus:** `translateY(-0.5)` + sombra glow; focus visible con ring 2px en `#3D6A20` y offset 2px. Transición 300ms.
- **Outline:** borde 1px, fondo blanco, texto tinta; el borde vira a verde en hover.

### Chips
- **Style:** píldora con borde `#E2E8F0`, fondo blanco o `#F8FAFC`, texto 12px.
- **State:** seleccionado = fondo naranja + texto tinta; no seleccionado = borde fino. Los chips de filtro nunca llevan sombra.

### Cards / Containers
- **Corner Style:** `24px` en tienda, `12px` en admin.
- **Background:** blanco; alternas en `#F8FAFC`.
- **Shadow Strategy:** ver Elevation; en reposo solo borde.
- **Border:** 1px `#E2E8F0` al 50% en tienda.
- **Internal Padding:** 20–24px; la imagen del producto respira con `p-5` sobre `aspect-[4/5]`.

### Inputs / Fields
- **Style:** fondo blanco, borde 1px `#E2E8F0`, radio `12px`, padding `12px 16px`, 16px de font-size en móvil para evitar el zoom de iOS.
- **Focus:** borde + ring verde (`#72BF44`), sin glow.
- **Error / Disabled:** mensaje en `--danger-text` sobre `--danger-bg`; disabled baja opacidad a 50% y corta punteros.

### Navigation
- **Style:** header blanco de 64–72px, logo "Nutri**Fit**" con el verde en "Fit", links 14px peso 600 en tinta que viran a verde en hover.
- **Mobile:** menú en sheet, búsqueda en overlay a pantalla completa; el badge del carrito es una píldora naranja de 18px mínimo.
- **TopBar:** franja verde con texto tinta, una sola línea de mensaje (envío / retiro Metro).

### Etiqueta de Entrega (signature)
Chip o bloque que declara el punto de entrega ("Retiro en Metro de Santiago · Líneas 1, 2, 5" o "Envío a domicilio") junto al precio o al CTA. Es el componente que materializa el North Star: dato duro, formato de etiqueta, siempre a la vista.

## Do's and Don'ts

### Do:
- **Do** usar `#72BF44` como fondo, borde o ícono, y `#3D6A20` cuando el verde sea texto.
- **Do** poner texto de tinta sobre verde y naranja; blanco solo sobre tinta o sobre `#3D6A20`.
- **Do** reservar Bebas Neue en mayúsculas para titulares y cifras; el resto en Inter.
- **Do** mantener la entrega (Metro/domicilio) visible en el bloque de compra.
- **Do** dejar las cards planas en reposo y elevar solo al hover.
- **Do** usar píldoras para todo lo que sea acción, filtro o sello.
- **Do** mantener objetivos táctiles de al menos 44×44px, y 16px de font-size en inputs móviles.

### Don't:
- **Don't** usar `#72BF44` como color de texto sobre blanco (2.27:1).
- **Don't** poner `text-white` sobre `#72BF44` (2.27:1) ni sobre `#F97316` (2.80:1).
- **Don't** introducir un tercer acento; el sistema tiene verde, naranja y neutros.
- **Don't** usar Bebas Neue en párrafos ni simular su negrita.
- **Don't** apilar una etiqueta en mayúsculas sobre cada título; el titular ya carga la jerarquía.
- **Don't** anidar cards dentro de cards; separar con divisores o cambio de superficie.
- **Don't** bajar texto de cuerpo a menos de 12px.
