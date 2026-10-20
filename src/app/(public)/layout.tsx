import type { Metadata } from 'next';
import { BRAND } from '@/data/seed';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TopBar from '@/components/layout/TopBar';
import TrustStrip from '@/components/home/TrustStrip';
import CartDrawer from '@/components/layout/CartDrawer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import MetaPixel from '@/components/analytics/MetaPixel';
import GA4 from '@/components/analytics/GA4';

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  description:
    'Suplementos originales en Chile. Compra por WhatsApp y recibe en Metro de Santiago.',
  robots: { index: true, follow: true },
};

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BRAND.url}/#organization`,
    name: 'NutriFit',
    url: BRAND.url,
      logo: `${BRAND.url}/img/logo-fallback.png`,
      image: `${BRAND.url}/img/logo-fallback.png`,
    description:
      'Suplementos originales en Chile. Whey protein, creatina, vitaminas y bienestar. Compra por WhatsApp y entrega en estaciones de metro.',
    slogan: BRAND.tagline,
    sameAs: [BRAND.instagramUrl],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Santiago',
      addressCountry: 'CL',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: `+${BRAND.whatsappDigits}`,
      availableLanguage: 'es',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '20:00',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <FavoritesProvider>
        <CartProvider>
          <TopBar />
          <Header />
          <TrustStrip />
          <main>{children}</main>
          <Footer />
          <WhatsAppFloat />
          <CartDrawer />
          <MetaPixel />
          <GA4 />
        </CartProvider>
      </FavoritesProvider>
    </>
  );
}
