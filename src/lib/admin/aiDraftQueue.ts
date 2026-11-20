import type { ProductDraft, ProductDraftSource } from '@/types/productDraft';
import { draftToForm } from './productDraft';

export type QueueStatus = 'pending' | 'saving' | 'done' | 'error';

export type QueuedDraft = {
  id: string;
  createdAt: number;
  status: QueueStatus;
  error?: string;
  duplicateWarning?: string;
  /** Solo un barcode exacto bloquea; nombres parecidos son advertencia. */
  duplicateIsExact?: boolean;
  duplicates?: { exact: any[]; similar: any[] };
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  description: string;
  registroIsp: string;
  size: string;
  servings: string;
  ingredients: string;
  descriptionShort: string;
  seoTitle: string;
  flavors: string[];
  /** Trazabilidad: se guarda con el producto solo cuando el admin aprueba. */
  aiSources: ProductDraftSource[];
  aiConfidence: Record<string, number>;
  /** Precio y costo los pone el admin antes de aprobar; nunca los inventa la IA. */
  basePrice: string;
  costPrice: string;
};

const STORAGE_KEY = 'nutrifit:ai-draft-queue:v1';
export const MAX_QUEUE = 10;
export const QUEUE_TTL_MS = 24 * 60 * 60 * 1000;

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeQueueItem(
  draft: ProductDraft,
  extra: {
    duplicateWarning?: string;
    duplicateIsExact?: boolean;
    duplicates?: { exact: any[]; similar: any[] };
    basePrice?: string;
    costPrice?: string;
  } = {},
): QueuedDraft {
  const { form } = draftToForm(draft);
  return {
    id: newId(),
    createdAt: Date.now(),
    status: 'pending',
    duplicateWarning: extra.duplicateWarning,
    duplicateIsExact: extra.duplicateIsExact ?? false,
    duplicates: extra.duplicates,
    ...form,
    flavors: (draft.flavors || []).map((f) => f.trim()).filter(Boolean),
    aiSources: draft.sources || [],
    aiConfidence: draft.confidence || {},
    basePrice: extra.basePrice || '',
    costPrice: extra.costPrice || '',
  };
}

export function loadQueue(): QueuedDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed
      .filter((item): item is QueuedDraft => !!item && typeof item.id === 'string' && typeof item.name === 'string')
      .filter((item) => now - Number(item.createdAt || 0) < QUEUE_TTL_MS)
      .slice(0, MAX_QUEUE)
      // Un reload no puede dejar un item trabado en "saving" y las colas
      // viejas no tenían trazabilidad: la rellenamos vacía.
      .map((item) => ({
        ...item,
        status: item.status === 'saving' ? ('pending' as const) : item.status,
        aiSources: Array.isArray(item.aiSources) ? item.aiSources : [],
        aiConfidence:
          item.aiConfidence && typeof item.aiConfidence === 'object' ? item.aiConfidence : {},
      }));
  } catch {
    return [];
  }
}

export function saveQueue(items: QueuedDraft[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_QUEUE)));
  } catch {
    // localStorage lleno o bloqueado: la cola es solo comodidad, no crítico.
  }
}

export function patchQueueItem(id: string, patch: Partial<QueuedDraft>): (items: QueuedDraft[]) => QueuedDraft[] {
  return (items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
