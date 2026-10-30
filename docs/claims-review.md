# Revisión de afirmaciones y testimonios

> Generado por `scripts/scan-claims.ts` el 29 de octubre de 2026 a las 10:35 p. m. (America/Santiago).
> **Este informe no cambia contenido.** Cada hallazgo requiere decisión del dueño:
> mantener (con respaldo), reescribir o quitar.

## Resumen

| Severidad | Hallazgos |
|---|---|
| Alta | 30 |
| Media | 14 |
| Baja | 1 |
| **Total** | **45** |

Regla aplicada: una afirmación de efecto terapéutico, un resultado garantizado o
un testimonio causal **no se publica** sin fuente verificable y redacción
aprobada (AGENTS.md §7). La evidencia de un ingrediente no respalda un producto.

## Hallazgos

| # | Severidad | Ubicación | Tipo | Texto |
|---|---|---|---|---|
| 1 | Alta | `src/app/(public)/sobre-nosotros/page.tsx:31` | resultado garantizado | 'Originales garantizados', |
| 2 | Alta | `src/data/seed.ts:137` | enfermedad o síntoma | 'Omega 3 Premium con ácidos grasos poliinsaturados EPA y DHA, componentes esenciales de las membranas celulares, especialmente en cerebro, retina y tejido nervioso. Favorece la función cerebral, la salud cardiovascular,  |
| 3 | Alta | `src/data/seed.ts:138` | verbo terapéutico | ['Contribuye a mejorar la función cerebral', 'Ayuda a prevenir enfermedades cardiovasculares', 'Beneficioso en condiciones inflamatorias', 'Protege la salud ocular', 'Efectos positivos en la salud mental'], |
| 4 | Alta | `src/data/seed.ts:160` | enfermedad o síntoma | ['Equilibra el azúcar en sangre y mejora la sensibilidad a la insulina', 'Apoyo cardiovascular y perfil lipídico saludable', 'Control de peso y metabolismo activo', 'Protección hepática', 'Energía celular y vitalidad (AM |
| 5 | Alta | `src/data/seed.ts:226` | enfermedad o síntoma | ['Favorece el sistema nervioso', 'Aporta claridad mental', 'Efecto adaptógeno', 'Reduce los niveles de estrés y ansiedad'], |
| 6 | Alta | `src/data/seed.ts:247` | enfermedad o síntoma | 'Melena de León (Hericium erinaceus), hongo comestible reconocido por su impacto positivo en el sistema nervioso, la salud cognitiva y sus propiedades antiinflamatorias y prebióticas. Ayuda a reducir el estrés y la ansie |
| 7 | Alta | `src/data/seed.ts:248` | enfermedad o síntoma | ['Fortalece el sistema inmunológico', 'Regeneración del tejido nervioso y efectos neuroprotectores', 'Mejora memoria y aprendizaje', 'Favorece la reducción de la inflamación'], |
| 8 | Alta | `src/data/seed.ts:269` | enfermedad o síntoma | 'Multivitamínico diseñado para mujeres con vitamina C, calcio, vitamina E, hierro y otros nutrientes esenciales. Fortalece el sistema inmunológico, mantiene huesos y dientes fuertes, mejora la salud de la piel y el cabel |
| 9 | Alta | `src/data/seed.ts:270` | enfermedad o síntoma | ['Ayuda a corregir deficiencias nutricionales', 'Promueve la salud de la piel y el cabello', 'Aporta nutrientes esenciales en edad reproductiva', 'Apoyo en la función cognitiva y neurológica', 'Contribuye a la salud card |
| 10 | Alta | `src/data/seed.ts:307` | quemador / testosterona | 'FNL Quemador de Grasa Lipo 9 Bestial – 120 Cápsulas', |
| 11 | Alta | `src/data/seed.ts:313` | quemador / testosterona | 'Quemador de grasa Lipo 9 Bestial con fórmula termogénica que combina cafeína, té verde, L-carnitina, vinagre de manzana y más. Ideal para apoyar el metabolismo, la energía y el control de peso. 120 cápsulas, 2 al día.', |
| 12 | Alta | `src/data/seed.ts:321` | quemador / testosterona | [['Presentación', '120 cápsulas'], ['Porción diaria', '2 cápsulas'], ['Formato', 'Quemador de grasa termogénico']], |
| 13 | Alta | `src/data/seed.ts:324` | quemador / testosterona | ['quemador', 'lipo', 'grasa', 'termogenico', 'cafeina', 'fnl', 'capsulas'], |
| 14 | Alta | `src/data/seed.ts:380` | verbo terapéutico | ['Contribuye a prevenir el envejecimiento prematuro y enfermedades crónicas por su acción antioxidante', 'Ayuda a estimular la producción de glóbulos blancos para combatir infecciones', 'Mantiene la salud de los vasos sa |
| 15 | Alta | `src/data/seed.ts:446` | enfermedad o síntoma | ['DHA y EPA de microalgas marinas, la fuente primaria de omega-3', 'DHA, el ácido graso más abundante en cerebro y retina, esencial para cognición y visión', 'EPA con rol antiinflamatorio y cardiovascular documentado', ' |
| 16 | Alta | `src/data/seed.ts:498` | quemador / testosterona | [['Formato', '90 cápsulas de 600 mg (1,5 meses)'], ['Dosis', '2 cápsulas al día'], ['Tipo', 'Quemador keto (cetosis celular)']], |
| 17 | Alta | `src/data/seed.ts:501` | quemador / testosterona | ['keto', 'slim', 'quemador', 'grasa', 'cetosis', 'vinagre de manzana', 'fnl', 'capsulas'], |
| 18 | Alta | `src/data/seed.ts:535` | enfermedad o síntoma | 'La L-carnitina es valorada por su importancia en el metabolismo energético. Desempeña un papel crucial en el transporte de ácidos grasos a las mitocondrias, donde se queman para producir energía, optimizando la utilizac |
| 19 | Alta | `src/data/seed.ts:536` | enfermedad o síntoma | ['Promueve la utilización de grasa como fuente de energía', 'Ayuda a movilizar el tejido adiposo hacia el interior de las mitocondrias', 'Mejora la salud cardiovascular al disminuir los niveles de colesterol LDL', 'Apoya |
| 20 | Alta | `src/data/seed.ts:558` | enfermedad o síntoma | ['Apoya el bienestar general y previene deficiencias nutricionales', 'Contribuye a reducir la fatiga física y mental', 'Fortalece el sistema inmune', 'Aporta al buen funcionamiento cardiovascular', 'Favorece la salud de  |
| 21 | Alta | `src/data/seed.ts:602` | quemador / testosterona | ['Soporte de testosterona y vitalidad: el zinc, magnesio y ácido D-aspártico intervienen en los procesos de optimización hormonal natural', 'Rendimiento y vasodilatación: la L-arginina favorece la circulación sanguínea m |
| 22 | Alta | `src/data/seed.ts:612` | quemador / testosterona | ['testofull', 'testosterona', 'zma', 'acido d-aspartico', 'arginina', 'glutamina', 'shiitake', 'vitalidad', 'rain', 'capsulas'], |
| 23 | Alta | `src/data/seed.ts:646` | enfermedad o síntoma | ['Ayuda a mantener y generar masa muscular', 'Contribuye a la regeneración y recuperación de tejidos', 'Previene y contribuye al tratamiento de algunos tipos de anemia', 'Previene la caída del cabello y fortalece el folí |
| 24 | Alta | `src/data/seed.ts:748` | quemador / testosterona | 'Proteína 100% whey en polvo de OstroVit, formato 700 g sabor Chocolate Dream que rinde 23 servicios. Aporta 21 g de proteína y 4,8 g de BCAAs por servicio. Alto contenido proteico con efecto anabólico y anticatabólico,  |
| 25 | Alta | `src/data/seed.ts:752` | quemador / testosterona | 'Efecto anabólico: ayuda a desarrollar masa muscular pura', |
| 26 | Alta | `src/data/seed.ts:753` | verbo terapéutico | 'Efecto anticatabólico: previene la degradación muscular', |
| 27 | Alta | `src/data/seed.ts:784` | verbo terapéutico | 'Previene la degradación y el catabolismo proteico', |
| 28 | Alta | `src/data/seed.ts:833` | quemador / testosterona | 'NF-REND-RAIN-TESTO-180C', |
| 29 | Alta | `src/data/seed.ts:992` | quemador / testosterona | 'Quemadores y apoyo al metabolismo', |
| 30 | Alta | `src/data/seed.ts:1101` | enfermedad o síntoma | 'Omega 3 + berberina para corazón, colesterol y metabolismo.', |
| 31 | Media | `src/components/home/UGCProof.tsx:50` | digestión | 'Llevo 3 meses comprando aquí. La berberina me ayudó con la digestión y la omega 3 es de las mejores que he probado. 100% recomendado.', |
| 32 | Media | `src/components/home/UGCProof.tsx:95` | testimonio causal | 'La glutamina con electrolíticos me ayudó caleta con la recuperación post-crossfit. Producto original y buen precio. Ya hice mi segunda compra.', |
| 33 | Media | `src/data/seed.ts:181` | sistema inmunitario | 'Shilajit estandarizado al 50% en Ácido Fúlvico, un mineral milenario usado en la medicina tradicional por sus efectos revitalizantes. Aumenta la energía, fortalece el sistema inmunológico y desintoxica el cuerpo de mane |
| 34 | Media | `src/data/seed.ts:182` | sistema inmunitario | ['Aumento de energía', 'Apoyo al sistema inmune', 'Desintoxicación profunda', 'Antioxidante natural'], |
| 35 | Media | `src/data/seed.ts:291` | sistema inmunitario | 'Aceite de Orégano en softgels, extraído cuidadosamente para preservar su pureza y potencia. Ideal para fortalecer el sistema inmunológico y promover la salud respiratoria, digestiva y general. 60 cápsulas (1 mes), 2 cáp |
| 36 | Media | `src/data/seed.ts:302` | sistema inmunitario | ['oregano', 'aceite', 'inmunidad', 'respiratorio', 'fnl', 'capsulas', 'salud'], |
| 37 | Media | `src/data/seed.ts:390` | sistema inmunitario | ['vitamina c', 'ascorbato de sodio', 'antioxidante', 'inmunidad', 'no acida', 'fnl', 'capsulas'], |
| 38 | Media | `src/data/seed.ts:512` | sistema inmunitario | 'Cola de Pavo, también conocido como Turkey Tail (Coriolus versicolor), es un hongo medicinal milenario usado por sus potentes propiedades inmunomoduladoras y digestivas. Su composición rica en polisacáridos (PSP y PSK)  |
| 39 | Media | `src/data/seed.ts:513` | sistema inmunitario | ['Estimula el sistema inmune y las defensas naturales', 'Contribuye a equilibrar la microbiota intestinal', 'Rico en antioxidantes que combaten el daño celular', 'Apoya el bienestar digestivo y metabólico', 'Ideal como c |
| 40 | Media | `src/data/seed.ts:523` | sistema inmunitario | ['cola de pavo', 'turkey tail', 'coriolus', 'hongos', 'inmunidad', 'microbiota', 'fnl', 'capsulas'], |
| 41 | Media | `src/data/seed.ts:557` | sistema inmunitario | 'VITAMINS MEN es un suplemento multivitamínico diseñado para apoyar la salud integral del cuerpo. Su fórmula combina vitaminas y minerales esenciales que contribuyen al funcionamiento del sistema inmunológico, la producc |
| 42 | Media | `src/data/seed.ts:671` | sin grasa / sin calorías | 'Baja en carbohidratos y grasas: solo 2.3 g de hidratos y 1.7 g de grasa por porción, sin calorías no deseadas', |
| 43 | Media | `src/data/seed.ts:672` | digestión | 'Fácil digestión: 100% vegetal, libre de lactosa, gluten y soya; perfecta para intolerantes y dietas específicas', |
| 44 | Media | `src/data/seed.ts:1156` | testimonio causal | 'El magnesio me ayudó caleta a dormir, no cachaba que era eso hasta que me lo recomendaron. La atención por WhatsApp fue súper rápida y me lo dejaron en Tobalaba.', |
| 45 | Baja | `src/data/seed.ts:1089` | superlativo | 'Óxido nítrico + L-citrulina para el mejor pump y circulación.', |

## Criterios de revisión

- **Alta**: retirar o reformular antes de volver a publicar. Incluye enfermedad,
  cura/tratamiento, hormonas, "quemador" y resultados garantizados.
- **Media**: se puede mantener solo si está acotado a lo que el producto es
  (por ejemplo, "aporta proteína") y sin prometer un efecto clínico.
- **Baja**: superlativos y comparaciones; se prefieren descripciones concretas.

## Qué no cubre este informe

- **Reseñas de clientes**: viven en la base de datos y se leen por la API
  (`/api/reviews`). Hay que revisarlas desde el panel o con una consulta a la
  base; el script no inventa su contenido.
- **Imágenes y videos**: las etiquetas y empaques pueden incluir claims que no
  están en el texto del sitio.
- **Ficha técnica de cada producto**: la revisión de composición y dosis es la
  del Laboratorio NutriFit, no este barrido de copy.

## Siguiente paso

1. El dueño marca cada fila: mantener / reescribir / quitar.
2. Lo que se mantenga necesita fuente en `sources` y redacción aprobada.
3. Volver a correr `npm run scan:claims` y comparar el conteo con este informe.
