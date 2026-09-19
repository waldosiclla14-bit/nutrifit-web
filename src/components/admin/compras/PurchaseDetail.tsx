'use client';

import { Camera, CheckCircle, FilePlus, FileText, RotateCcw, Send, Truck, X } from 'lucide-react';
import type { Purchase } from './types';
import { statusColor, statusLabel } from './helpers';

export function PurchaseDetail({
  purchase: p,
  onBack,
  onEditCopy,
  onConfirm,
  onCancel,
  onStartReceipt,
  onPhotoFile,
  onDocFile,
  onOCR,
  onViewDoc,
}: {
  purchase: Purchase;
  onBack: () => void;
  onEditCopy: () => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onStartReceipt: () => void;
  onPhotoFile: (file: File) => void;
  onDocFile: (file: File) => void;
  onOCR: (id: string) => void;
  onViewDoc: (purchaseId: string, docId: string, name: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-muted">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-ink">{p.purchaseNumber}</h2>
          <p className="text-[10px] text-muted">
            {p.supplier?.name || 'Sin proveedor'} | {p.createdAt?.slice(0, 10)}
          </p>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${statusColor(p.status)}`}>
          {statusLabel(p.status)}
        </span>
      </div>

      <div className="bg-paper rounded-xl p-4 border border-line">
        <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Documento</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted">Tipo:</span> <span className="font-semibold">{p.documentType || '-'}</span>
          </div>
          <div>
            <span className="text-muted">N:</span> <span className="font-semibold">{p.documentNumber || '-'}</span>
          </div>
          <div>
            <span className="text-muted">Fecha:</span>{' '}
            <span className="font-semibold">{p.documentDate?.slice(0, 10) || '-'}</span>
          </div>
          <div>
            <span className="text-muted">Pago:</span> <span className="font-semibold">{p.paymentMethod || '-'}</span>
          </div>
        </div>
        {p.notes && <p className="text-xs text-muted mt-2">{p.notes}</p>}
      </div>

      <div className="bg-paper rounded-xl p-4 border border-line">
        <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Productos ({p.items.length})</h3>
        <div className="space-y-2">
          {p.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-soft border border-line">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-ink truncate">{item.productName}</p>
                {item.variantName && <p className="text-[10px] text-muted truncate">{item.variantName}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted">
                  x{item.quantity} @ ${item.unitCost.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-accent">${item.totalCost.toLocaleString()}</p>
              </div>
              {item.receivedQty > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-semibold">
                  {item.receivedQty}/{item.quantity}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
          <div className="text-xs text-muted">
            <span>Subtotal: ${p.subtotal.toLocaleString()}</span>
            {p.tax > 0 && <span className="ml-2">IVA: ${p.tax.toLocaleString()}</span>}
            {p.discount > 0 && <span className="ml-2">Desc: -${p.discount.toLocaleString()}</span>}
          </div>
          <span className="text-lg font-bold text-ink">${p.total.toLocaleString()}</span>
        </div>
      </div>

      {p.documents && p.documents.length > 0 && (
        <div className="bg-paper rounded-xl p-4 border border-line">
          <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">
            Documentos ({p.documents.length})
          </h3>
          <div className="space-y-1">
            {p.documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg bg-soft text-xs">
                <FileText className="h-4 w-4 text-muted" />
                <span className="flex-1 truncate">{doc.fileName}</span>
                <span className="text-muted">{(doc.fileSize / 1024).toFixed(0)}KB</span>
                {doc.ocrProcessed ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <button onClick={() => onOCR(p.id)} className="text-accent font-semibold underline whitespace-nowrap">
                    Ejecutar OCR
                  </button>
                )}
                <button onClick={() => onViewDoc(p.id, doc.id, doc.fileName)} className="text-accent font-semibold underline">
                  Ver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.receipts && p.receipts.length > 0 && (
        <div className="bg-paper rounded-xl p-4 border border-line">
          <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">
            Recepciones ({p.receipts.length})
          </h3>
          <div className="space-y-2">
            {p.receipts.map((r: any) => (
              <div key={r.id} className="p-2.5 rounded-xl bg-soft border border-line text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{r.receiptNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${
                      r.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-600'
                        : r.status === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {r.status === 'COMPLETED' ? 'Completa' : r.status === 'PARTIAL' ? 'Parcial' : 'Pendiente'}
                  </span>
                </div>
                <p className="text-muted">{r.receivedAt?.slice(0, 10)}</p>
                {r.items && (
                  <div className="mt-1 space-y-0.5">
                    {r.items.map((ri: any) => (
                      <p key={ri.id} className="text-muted">
                        {ri.purchaseItem?.productName}: {ri.receivedQty}/{ri.expectedQty}
                        {ri.damagedQty > 0 && <span className="text-red-500"> ({ri.damagedQty} dañado)</span>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-paper rounded-xl p-4 border border-line">
        <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Acciones</h3>
        <div className="flex flex-wrap gap-2">
          {p.status === 'DRAFT' && (
            <button
              onClick={onEditCopy}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-soft border border-line"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Editar
            </button>
          )}
          {p.status === 'DRAFT' && (
            <button
              onClick={() => onConfirm(p.id)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-500 text-white"
            >
              <Send className="h-3.5 w-3.5" /> Confirmar
            </button>
          )}
          {p.status === 'CONFIRMED' && (
            <button
              onClick={onStartReceipt}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-green-500 text-white"
            >
              <Truck className="h-3.5 w-3.5" /> Recepcionar
            </button>
          )}
          {p.status !== 'CANCELLED' && p.status !== 'RECEIVED' && (
            <button
              onClick={() => onCancel(p.id)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-red-100 text-red-600"
            >
              <X className="h-3.5 w-3.5" /> Anular
            </button>
          )}
          <label className="relative flex cursor-pointer items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-ink text-paper overflow-hidden">
            <Camera className="h-3.5 w-3.5" /> Tomar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPhotoFile(file);
                e.target.value = '';
              }}
            />
          </label>
          <label className="relative flex cursor-pointer items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-soft border border-line overflow-hidden">
            <FilePlus className="h-3.5 w-3.5" /> Adjuntar
            <input
              type="file"
              accept="image/*,.pdf"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onDocFile(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
