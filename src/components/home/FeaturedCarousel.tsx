import { PRODUCTS } from '@/data/seed';
import { getDiscount } from '@/lib/utils';
import HomeCarousel from '@/components/home/HomeCarousel';

// Curaduría editorial explícita (no depende de métricas no verificables).
const TOP_IDS = [4, 7, 6, 9, 10, 13, 15, 22];

export default function FeaturedCarousel() {
  const byIds = (ids: number[]) =>
    ids.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean) as typeof PRODUCTS;

  const top = byIds(TOP_IDS);

  const offers = PRODUCTS.filter((p) => getDiscount(p)).sort(
    (a, b) => (getDiscount(b) ?? 0) - (getDiscount(a) ?? 0),
  );

  const arrivals = PRODUCTS.filter((p) => p.newArrival);

  return (
    <>
      <HomeCarousel
        id="destacados"
        eyebrow="MÁS VENDIDOS"
        title="Top"
        highlight="ventas"
        subtitle="Los productos favoritos de nuestros clientes en Santiago."
        products={top}
      />
      <HomeCarousel
        id="ofertas"
        eyebrow="OFERTAS"
        title="En"
        highlight="oferta"
        subtitle="Precios rebajados por tiempo limitado. Aprovecha antes de que se agoten."
        products={offers}
        surface={false}
      />
      <HomeCarousel
        id="novedades"
        eyebrow="RECIÉN LLEGADOS"
        title="Nuevos en"
        highlight="NutriFit"
        subtitle="Lo último que sumamos a nuestro catálogo."
        products={arrivals}
      />
    </>
  );
}
