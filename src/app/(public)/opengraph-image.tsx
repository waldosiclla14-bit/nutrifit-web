import { ImageResponse } from 'next/og';
import { BRAND } from '@/data/seed';

export const runtime = 'edge';

export const alt = 'NUTRIFIT — Suplementos originales en Chile';
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
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0b0b0b',
          color: '#ffffff',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -120,
            top: -180,
            width: 620,
            height: 620,
            borderRadius: 999,
            background: '#b2f237',
            opacity: 0.9,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 420,
              height: 180,
              borderRadius: 30,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              overflow: 'hidden',
            }}
          >
            <img
              src={`${BRAND.url}/img/logo.png`}
              alt="Logo NutriFit"
              width={420}
              height={180}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#b2f237', letterSpacing: 3 }}>
            PRODUCTOS ORIGINALES · SANTIAGO
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 82, fontWeight: 900, lineHeight: 0.98 }}>
            <span>WHEY +</span>
            <span style={{ color: '#b2f237' }}>CREATINA</span>
          </div>
          <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.78)' }}>
            Packs desde $27.500 · Elige tu sabor
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            Compra por WhatsApp · Entrega en estaciones de Metro
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0b0b0b', background: '#b2f237', padding: '12px 20px', borderRadius: 999 }}>
            {BRAND.whatsapp}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
