/**
 * Valores de negocio en un solo lugar (tarifas, plazos, umbrales, políticas).
 *
 * Regla: si un número o una promesa aparece en la interfaz, sale de aquí.
 * No se escribe "$1.000", "10 días" ni "24–48 hrs" a mano en los componentes.
 *
 * Las tarifas y los días de garantía vienen de `policies.ts`, que es la capa
 * con la fuente oficial anotada (Blue Express, política de devoluciones).
 *
 * Todos los valores son los vigentes al 29-oct-2026. Los marcados
 * «DECISIÓN DEL DUEÑO» se pueden cambiar aquí sin tocar componentes.
 */
import { RETURN_DAYS, SHIPPING_BLUE_FEE, SHIPPING_METRO_FEE } from '@/lib/policies';

export const siteConfig = {
  delivery: {
    /**
     * Promesa única de entrega (hero, franja de confianza, FAQ, JSON-LD).
     * DECISIÓN DEL DUEÑO: hoy el sitio decía "hoy" en el hero y "24–48 hrs" en
     * el FAQ. Se unificó en la versión del FAQ, que es la más conservadora.
     * Si la entrega real es el mismo día, cambiar solo este texto.
     */
    promise: 'Entrega coordinada por WhatsApp, normalmente en 24 a 48 horas.',
    promiseShort: '24–48 hrs',
    metroFee: SHIPPING_METRO_FEE,
    domicilioFeeFrom: SHIPPING_BLUE_FEE,
    coverage: 'Estaciones de Metro de Santiago o envío a domicilio en Santiago.',
  },

  payment: {
    /** Medios de pago reales: no hay pasarela online. */
    methods: ['Transferencia bancaria', 'Efectivo contra entrega'],
    label: 'Pago contra entrega o transferencia',
    online: false,
  },

  warranty: {
    days: RETURN_DAYS,
    short: `Garantía ${RETURN_DAYS} días`,
    /**
     * DECISIÓN DEL DUEÑO: texto único de garantía. Antes convivían
     * "devolvemos tu dinero sin preguntas", "cambios garantizados" y
     * "solo productos sin abrir". Se usa la versión más restrictiva.
     */
    text: `Garantía de ${RETURN_DAYS} días en productos sin abrir y con sello intacto.`,
    textShort: `Productos sin abrir, hasta ${RETURN_DAYS} días`,
  },

  offers: {
    /** DECISIÓN DEL DUEÑO: umbral y % del descuento por monto (hoy $60.000 / 5 %). */
    rewardThreshold: 60000,
    rewardPercent: 5,
    /** Stock a partir del cual se muestra urgencia. */
    lowStockThreshold: 5,
    /** Tope de productos en la sección "En oferta". */
    maxOnSale: 8,
    /**
     * Solo se muestra precio tachado y % si el producto tiene
     * `compareAtVerified: true`. Mientras el dueño no confirme qué precios
     * "antes" son reales, no se muestra ninguno.
     * Poner en `false` restaura el comportamiento anterior de inmediato.
     */
    requireVerifiedCompareAt: true,
  },

  stock: {
    /**
     * DECISIÓN DEL DUEÑO: el `stock` del seed no está sincronizado con el
     * inventario real, así que no se muestra "solo quedan N unidades".
     * Cambiar a `true` cuando el stock venga de la base de datos.
     */
    showCounts: false,
  },

  reviews: {
    /** Bajo este número de reseñas no se muestran estrellas ni nota. */
    minCount: 1,
  },
} as const;
