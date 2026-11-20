import { loadQueue, makeQueueItem, MAX_QUEUE, patchQueueItem, QUEUE_TTL_MS, saveQueue } from './aiDraftQueue';
import type { ProductDraft } from '@/types/productDraft';

const draft: ProductDraft = {
  name: 'Creatina 300 g',
  brand: 'FullEnergic',
  category: 'Creatina',
  flavors: ['Sin sabor'],
  size: '300 g',
  servings: 60,
  isp_number: null,
  ingredients: null,
  barcode: null,
  description_short: 'Creatina monohidrato',
  seo_title: 'Creatina 300 g',
  sku_suggested: 'cre-300g',
  confidence: {},
  sources: [],
};

describe('aiDraftQueue', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    (global as any).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    };
  });

  it('crea un item sin precio ni stock y con copia de los sabores', () => {
    const item = makeQueueItem(draft, { duplicateWarning: 'Nombre parecido' });

    expect(item).toMatchObject({
      name: 'Creatina 300 g',
      sku: 'cre-300g',
      flavors: ['Sin sabor'],
      basePrice: '',
      costPrice: '',
      status: 'pending',
      duplicateWarning: 'Nombre parecido',
    });
    expect(item.id).toBeTruthy();
    expect(item.createdAt).toBeGreaterThan(0);
  });

  it('descarta items viejos, limita a 10 y destraba los que quedaron en saving', () => {
    const fresh = makeQueueItem(draft);
    const stale = { ...makeQueueItem(draft), id: 'old', createdAt: Date.now() - QUEUE_TTL_MS - 1 };
    const saving = { ...makeQueueItem(draft), id: 'stuck', status: 'saving' as const };
    const many = Array.from({ length: MAX_QUEUE + 3 }, (_, i) => ({ ...makeQueueItem(draft), id: `x${i}` }));
    saveQueue([saving, ...many, fresh, stale]);

    const loaded = loadQueue();

    expect(loaded).toHaveLength(MAX_QUEUE);
    expect(loaded.some((i) => i.id === 'old')).toBe(false);
    expect(loaded.find((i) => i.id === 'stuck')?.status).toBe('pending');
  });

  it('parchea un item por id sin tocar los demás', () => {
    const a = makeQueueItem(draft);
    const b = makeQueueItem(draft);
    const next = patchQueueItem(a.id, { basePrice: '24990', status: 'done' })([a, b]);

    expect(next.find((i) => i.id === a.id)).toMatchObject({ basePrice: '24990', status: 'done' });
    expect(next.find((i) => i.id === b.id)).toMatchObject({ basePrice: '', status: 'pending' });
  });
});
