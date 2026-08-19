import type { Metadata } from 'next';
import { BRAND } from '@/data/seed';
import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import PromoStrip from '@/components/home/PromoStrip';
import PromoBanner from '@/components/home/PromoBanner';
import TrackOrderChip from '@/components/home/TrackOrderChip';
import FirstOrderOffer from '@/components/home/FirstOrderOffer';
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

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${BRAND.url}/#website`,
      url: BRAND.url,
      name: BRAND.name,
      publisher: { '@id': `${BRAND.url}/#organization` },
      inLanguage: 'es-CL',
    },
    {
      '@type': 'Store',
      '@id': `${BRAND.url}/#store`,
      name: 'NUTRIFIT Suplementos',
      url: BRAND.url,
      logo: `${BRAND.url}/img/logo.png`,
      image: `${BRAND.url}/img/logo.png`,
      description:
        'Tienda de suplementos deportivos y vitaminas en Santiago de Chile. Entrega en estaciones de Metro en todas las líneas.',
      telephone: `+${BRAND.whatsappDigits}`,
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Santiago',
        addressCountry: 'CL',
      },
      areaServed: {
        '@type': 'City',
        name: 'Santiago de Chile',
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '10:00',
          closes: '20:00',
        },
      ],
      sameAs: [BRAND.instagramUrl],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <Hero />
      <Marquee />
      <Testimonials />
      <PromoStrip />
      <PromoBanner />
      <TrackOrderChip />
      <BundlesSection />
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
      <Benefits />
      <HowTo />
      <MetroCoverage />
      <FAQ />
      <Storytelling />
      <BlogPreview />
      <Newsletter />
      <FirstOrderOffer />
    </>
  );
}
