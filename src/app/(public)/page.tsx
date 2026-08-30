import type { Metadata } from 'next';
import { BRAND } from '@/data/seed';
import Hero from '@/components/home/Hero';
import FirstOrderOffer from '@/components/home/FirstOrderOffer';
import Categories from '@/components/home/Categories';
import FeaturedCarousel from '@/components/home/FeaturedCarousel';
import CrossSell from '@/components/home/CrossSell';
import Benefits from '@/components/home/Benefits';
import HowTo from '@/components/home/HowTo';
import Guarantee from '@/components/home/Guarantee';
import MetroCoverage from '@/components/home/MetroCoverage';
import FAQ from '@/components/home/FAQ';
import Testimonials from '@/components/home/Testimonials';

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
      <Testimonials />
      <FeaturedCarousel />
      <CrossSell />
      <Categories />
      <Benefits />
      <HowTo />
      <Guarantee />
      <MetroCoverage />
      <FAQ />
      <FirstOrderOffer />
    </>
  );
}
