import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import PromoStrip from '@/components/home/PromoStrip';
import PromoBanner from '@/components/home/PromoBanner';
import Categories from '@/components/home/Categories';
import FeaturedCarousel from '@/components/home/FeaturedCarousel';
import CategoryCarousel from '@/components/home/CategoryCarousel';
import Combos from '@/components/home/Combos';
import BundlesSection from '@/components/home/BundlesSection';
import Benefits from '@/components/home/Benefits';
import HowTo from '@/components/home/HowTo';
import MetroCoverage from '@/components/home/MetroCoverage';
import FAQ from '@/components/home/FAQ';
import Testimonials from '@/components/home/Testimonials';
import Storytelling from '@/components/home/Storytelling';
import BlogPreview from '@/components/home/BlogPreview';
import Newsletter from '@/components/home/Newsletter';

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <PromoStrip />
      <PromoBanner />
      <Categories />
      <FeaturedCarousel />
      <CategoryCarousel
        category="accesorios"
        eyebrow="COMPLEMENTOS"
        title="Accesorios y"
        highlight="shakers"
        linkLabel="Todos los accesorios"
      />
      <Combos />
      <BundlesSection />
      <Benefits />
      <HowTo />
      <MetroCoverage />
      <FAQ />
      <Testimonials />
      <Storytelling />
      <BlogPreview />
      <Newsletter />
    </>
  );
}
