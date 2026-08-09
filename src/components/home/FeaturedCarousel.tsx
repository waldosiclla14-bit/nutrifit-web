import { PRODUCTS } from '@/data/seed';
import Reveal from '@/components/ui/Reveal';
import BestSellerCard from '@/components/home/BestSellerCard';
import BestSellerCTA from '@/components/home/BestSellerCTA';

const TOP_SELLER_IDS = [1, 7, 22, 9];

export default function FeaturedCarousel() {
  const featured = TOP_SELLER_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );

  return (
    <section className="bg-soft py-14" id="destacados">
      <div className="container-px">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="section-label">DESTACADOS</p>
            <h2 className="section-title">
              Más <span className="text-accentDeep">vendidos</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {featured.map((product) => (
            <BestSellerCard key={product.id} product={product} />
          ))}
        </div>

        <BestSellerCTA />
      </div>
    </section>
  );
}
