import type { Metadata } from 'next';
import { BRAND } from '@/data/seed';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TrustStrip from '@/components/home/TrustStrip';
import CartDrawer from '@/components/layout/CartDrawer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import RecentSalesToast from '@/components/ui/RecentSalesToast';
import StickyCTAMobile from '@/components/home/StickyCTAMobile';
import ExitIntentPopup from '@/components/home/ExitIntentPopup';
import MetaPixel from '@/components/analytics/MetaPixel';
import GA4 from '@/components/analytics/GA4';

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: 'NutriFit | Whey, creatina y packs',
    template: '%s · NUTRIFIT',
  },
  description:
    'Suplementos originales en Chile. Compra por WhatsApp y recibe en Metro de Santiago.',
  keywords: [
    'suplementos deportivos chile',
    'whey protein',
    'creatina',
    'vitaminas',
    'proteína',
    'nutrición deportiva',
    'NUTRIFIT',
    'suplementos Santiago',
  ],
  authors: [{ name: 'NutriFit' }],
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: BRAND.url,
    siteName: BRAND.name,
    title: 'NutriFit | Whey, creatina y packs',
    description:
      'Suplementos originales en Chile. Compra por WhatsApp y recibe en Metro de Santiago.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'NutriFit whey, creatina y packs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NutriFit | Whey, creatina y packs',
    description:
      'Suplementos originales en Chile. Whey, creatina y vitaminas. Compra por WhatsApp y recibe en Metro de Santiago.',
    images: ['/opengraph-image'],
  },
  robots: { index: true, follow: true },
  icons: { icon: '/img/logo.png' },
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
    logo: `${BRAND.url}/img/logo.png`,
    image: `${BRAND.url}/img/logo.png`,
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
          <Header />
          <TrustStrip />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
          <WhatsAppFloat />
          <RecentSalesToast />
          <StickyCTAMobile />
          <ExitIntentPopup />
          <MetaPixel />
          <GA4 />
        </CartProvider>
      </FavoritesProvider>
    </>
  );
}
