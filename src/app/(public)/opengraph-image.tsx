import { ImageResponse } from 'next/og';
import { BRAND } from '@/data/seed';

export const runtime = 'edge';

export const alt = 'NUTRIFIT — Suplementos Deportivos Premium en Chile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0b0b0b',
          color: '#ffffff',
          padding: 64,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#b2f237',
              color: '#0b0b0b',
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            N
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>
            NUTRIFIT
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>
            <span>Suplementos Deportivos&nbsp;</span>
            <span style={{ color: '#b2f237' }}>Premium</span>
          </div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.75)' }}>
            Whey protein · Creatina · Vitaminas · Bienestar — Santiago de Chile
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 22, color: '#b2f237', fontWeight: 700 }}>
              {BRAND.tagline}
            </div>
            <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)' }}>
              Entrega en estaciones de metro · Compra por WhatsApp
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#b2f237' }}>
            {BRAND.whatsapp}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
