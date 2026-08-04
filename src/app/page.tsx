import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import PromoStrip from '@/components/home/PromoStrip';
import Categories from '@/components/home/Categories';
import FeaturedCarousel from '@/components/home/FeaturedCarousel';
import Combos from '@/components/home/Combos';
import Benefits from '@/components/home/Benefits';
import HowTo from '@/components/home/HowTo';
import FAQ from '@/components/home/FAQ';
import Testimonials from '@/components/home/Testimonials';
import Newsletter from '@/components/home/Newsletter';

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <PromoStrip />
      <Categories />
      <FeaturedCarousel />
      <Combos />
      <Benefits />
      <HowTo />
      <FAQ />
      <Testimonials />
      <Newsletter />
    </>
  );
}
