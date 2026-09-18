'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

let Html5QrcodeCtor: any = null;
async function getHtml5Qrcode() {
  if (Html5QrcodeCtor) return Html5QrcodeCtor;
  const mod = await import('html5-qrcode');
  Html5QrcodeCtor = mod.Html5Qrcode;
  return Html5QrcodeCtor;
}

export function BarcodeScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [status, setStatus] = useState('Iniciando camara...');
  const closedRef = useRef(false);

  useEffect(() => {
    let scanner: any = null;

    const start = async () => {
      try {
        const Html5Qrcode = await getHtml5Qrcode();
        if (closedRef.current) return;
        scanner = new Html5Qrcode(containerRef.current!);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.5,
            useBarCodeDetectorIfSupported: false,
            disableFlip: false,
          },
          (decodedText: string) => {
            if (!closedRef.current) {
              closedRef.current = true;
              scanner.stop().catch(() => {});
              onDetect(decodedText);
            }
          },
          () => {},
        );
        setStatus('Apunta al codigo de barras');
        try {
          const video = containerRef.current?.querySelector('video');
          if (video) {
            const stream = video.srcObject as MediaStream;
            const track = stream?.getVideoTracks()[0];
            if (track) {
              await track.applyConstraints({ advanced: [{ width: 1280, height: 720, focusMode: 'continuous' }] as any[] });
            }
          }
        } catch {}
      } catch (err: any) {
        if (!closedRef.current) {
          setStatus(`Error: ${err?.message || 'No se pudo acceder a la camara'}`);
        }
      }
    };

    start();

    return () => {
      closedRef.current = true;
      if (scanner) {
        scanner.stop().catch(() => {});
        scanner.clear().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={() => {
            closedRef.current = true;
            onClose();
          }}
          className="p-2 rounded-full bg-black/40 text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-white text-sm font-semibold">{status}</span>
        <div className="w-9" />
      </div>
      <div ref={containerRef} className="flex-1 [&>div]:!h-full" />
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-white/70 text-xs">Mantén el barcode dentro del recuadro</p>
      </div>
    </div>
  );
}
