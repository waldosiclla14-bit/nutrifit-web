'use client';

import { useEffect, useRef, useState } from 'react';

type Station = {
  id: string;
  name: string;
  line: string;
  lineName: string;
  commune: string;
  latitude: number;
  longitude: number;
  defaultMeetingPoint?: string | null;
  active: boolean;
  deliveryEnabled: boolean;
};

const LINE_COLORS: Record<string, string> = {
  L1: '#ee352e',
  L2: '#0078be',
  L3: '#9b26b6',
  L4: '#00a651',
  L4A: '#00a651',
  L5: '#00843d',
  L6: '#959595',
};

export default function StationMap({ stations, selectedLine }: { stations: Station[]; selectedLine?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
    if (key) setApiKey(key);
  }, []);

  useEffect(() => {
    if (!apiKey || !mapRef.current || mapLoaded) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
    script.async = true;
    script.defer = true;

    (window as any).initMap = () => {
      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: -33.4489, lng: -70.6693 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
      });

      const filtered = selectedLine ? stations.filter((s) => s.line === selectedLine) : stations;

      filtered.forEach((station) => {
        if (!station.active || !station.deliveryEnabled) return;

        const marker = new (window as any).google.maps.Marker({
          position: { lat: station.latitude, lng: station.longitude },
          map,
          title: `Metro ${station.name}`,
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: LINE_COLORS[station.line] || '#666',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });

        const infoWindow = new (window as any).google.maps.InfoWindow({
          content: `
            <div style="font-family:Inter,sans-serif;padding:4px;">
              <strong style="color:${LINE_COLORS[station.line] || '#333'}">Metro ${station.name}</strong>
              <div style="font-size:12px;color:#666;">${station.lineName} · ${station.commune}</div>
              ${station.defaultMeetingPoint ? `<div style="font-size:11px;color:#888;margin-top:4px;">📍 ${station.defaultMeetingPoint}</div>` : ''}
              <div style="font-size:11px;color:#00a651;margin-top:2px;">✓ Habilitada</div>
            </div>
          `,
        });

        marker.addListener('click', () => infoWindow.open(map, marker));
      });

      setMapLoaded(true);
    };

    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [apiKey, stations, selectedLine, mapLoaded]);

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center bg-soft rounded-xl p-8 text-center min-h-[300px]">
        <div className="text-3xl mb-3">🗺️</div>
        <p className="text-sm text-muted font-medium">Google Maps API key no configurada</p>
        <p className="text-xs text-muted/60 mt-1">
          Agrega <code className="bg-line/10 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> en .env.local
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-[400px] rounded-xl border border-line/20 overflow-hidden"
      style={{ minHeight: 400 }}
    />
  );
}
