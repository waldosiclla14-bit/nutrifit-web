import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'NutriFit — Whey + Creatina originales en Chile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GREEN = '#72BF44';
const PACK_PRICE = '$27.500';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#0A0A0A',
          color: '#ffffff',
          padding: 60,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'radial-gradient(circle at 88% 12%, rgba(114,191,68,0.28), transparent 46%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                width: 40,
                height: 40,
                borderRadius: 10,
                background: GREEN,
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0A0A0A',
                fontSize: 26,
                fontWeight: 900,
              }}
            >
              NF
            </div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, letterSpacing: 0.5 }}>
              Nutri<span style={{ color: GREEN }}>Fit</span>
            </div>
            <div
              style={{
                display: 'flex',
                marginLeft: 8,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 3,
                color: 'rgba(255,255,255,0.62)',
              }}
            >
              SUPLEMENTOS ORIGINALES
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 94,
                fontWeight: 900,
                lineHeight: 0.96,
                letterSpacing: -1,
              }}
            >
              <span>Whey + Creatina</span>
              <span style={{ color: GREEN }}>originales</span>
            </div>
            <div style={{ display: 'flex', fontSize: 32, color: 'rgba(255,255,255,0.80)' }}>
              Packs desde {PACK_PRICE} · Envío en estaciones de Metro
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255,255,255,0.14)',
              paddingTop: 26,
            }}
          >
            <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.78)' }}>
              Compra por WhatsApp · Garantía 10 días
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                fontWeight: 800,
                color: '#0A0A0A',
                background: GREEN,
                padding: '14px 24px',
                borderRadius: 999,
              }}
            >
              nutrifitsuplementos.cl
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
