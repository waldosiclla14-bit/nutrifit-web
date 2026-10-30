import type { Metadata } from 'next';
import { BRAND } from '@/data/seed';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Información Legal',
  description:
    'Políticas de entrega, términos y condiciones y política de privacidad de NutriFit, suplementos deportivos en Santiago de Chile.',
  alternates: { canonical: '/legal' },
};

export default function LegalPage() {
  return (
    <div className="container-px py-12">
      <p className="section-label">INFORMACIÓN</p>
      <h1 className="section-title mb-10">
        Políticas y <span className="text-sport-orange">términos</span>
      </h1>

      <div className="mx-auto max-w-3xl space-y-10">
        <section id="politicas-envio" className="rounded-3xl border border-sport-border bg-sport-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-wide">Políticas de Entrega</h2>
          <ul className="mt-4 list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-gray-600">
            <li>
              Puedes elegir entre dos modalidades: retiro en estaciones de metro de las líneas 1, 2,
              3, 4, 4A, 5 y 6 (todas las estaciones), o envío a domicilio en Santiago (Región
              Metropolitana) a través de Blue Express.
            </li>
            <li>
              Al confirmar tu pedido por WhatsApp, coordinamos el punto exacto (estación y acceso),
              o la dirección de entrega, el día y la hora.
            </li>
            <li>
              Las entregas normalmente se coordinan dentro de las 24 a 48 horas desde la confirmación
              del pedido. Los envíos a domicilio se coordinan según disponibilidad de Blue Express.
            </li>
            <li>
              El costo de entrega se informa en el carrito antes de confirmar: retiro en metro tiene
              tarifa fija y el envío a domicilio se cobra según el tamaño del paquete (tallas S y M).
              Si estás fuera de Santiago, lo confirmamos por WhatsApp.
            </li>
            <li>
              Los productos viajan sellados y protegidos. En caso de productos dañados, contáctanos
              al {BRAND.whatsapp} dentro de las 24 horas siguientes a la recepción.
            </li>
          </ul>
        </section>

        <section id="terminos" className="rounded-3xl border border-sport-border bg-sport-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-wide">Términos y Condiciones</h2>
          <p className="mt-4 text-sm text-gray-600">Al comprar en NutriFit aceptas los siguientes términos:</p>
          <ul className="mt-3 list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-gray-600">
            <li>Los precios publicados están expresados en pesos chilenos (CLP) e incluyen IVA.</li>
            <li>
              Las ofertas y descuentos pueden cambiar sin previo aviso y son válidas mientras dure el
              stock.
            </li>
            <li>
              Los suplementos son productos de venta regular en Chile. Es responsabilidad del cliente
              revisar las indicaciones, dosis y advertencias de cada producto.
            </li>
            <li>
              El pedido se considera confirmado una vez validados los datos de entrega y el método de
              pago por WhatsApp.
            </li>
            <li>
              {siteConfig.warranty.text}
            </li>
          </ul>
        </section>

        <section id="privacidad" className="rounded-3xl border border-sport-border bg-sport-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-wide">Política de Privacidad</h2>
          <p className="mt-4 text-sm text-gray-600">En NutriFit respetamos tu privacidad:</p>
          <ul className="mt-3 list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-gray-600">
            <li>
              Los datos que compartes (nombre, teléfono, línea y estación de metro) se usan
              únicamente para procesar y coordinar tu pedido.
            </li>
            <li>
              No vendemos ni compartimos tus datos con terceros con fines comerciales.
            </li>
            <li>
              Los datos de pago (transferencia o efectivo) se coordinan directamente por WhatsApp; no
              almacenamos datos de tarjetas.
            </li>
            <li>
              Puedes solicitar la eliminación de tus datos en cualquier momento escribiéndonos por
              WhatsApp.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
