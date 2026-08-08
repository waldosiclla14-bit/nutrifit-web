import type { Metadata } from 'next';
import { BRAND } from '@/data/seed';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
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
    default: 'NUTRIFIT | Suplementos Deportivos Premium — Santiago de Chile',
    template: '%s · NUTRIFIT',
  },
  description:
    'Tienda online de suplementos deportivos en Chile. Whey protein, creatina, vitaminas y bienestar. Productos originales, compra por WhatsApp y entrega en estaciones de metro.',
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
    title: 'NUTRIFIT | Suplementos Deportivos Premium',
    description:
      'Potencia tu rendimiento con suplementos deportivos y vitaminas de alta calidad en Chile.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NUTRIFIT | Suplementos Deportivos Premium',
    description:
      'Potencia tu rendimiento con suplementos deportivos y vitaminas de alta calidad en Chile.',
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
      'Suplementos deportivos premium en Chile. Whey protein, creatina, vitaminas y bienestar. Productos originales y entrega en estaciones de metro.',
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
