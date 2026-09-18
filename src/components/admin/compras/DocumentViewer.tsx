'use client';

import { ArrowLeft } from 'lucide-react';

export function DocumentViewer({ url, name, onBack }: { url: string; name: string; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-soft active:scale-95 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-ink truncate">{name}</h2>
      </div>
      <div className="bg-paper rounded-xl border border-line overflow-hidden">
        {url.startsWith('data:application/pdf') ? (
          <iframe src={url} className="w-full h-[70vh]" title={name} />
        ) : (
          <img src={url} alt={name} className="w-full object-contain max-h-[70vh]" />
        )}
      </div>
    </div>
  );
}
