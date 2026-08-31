'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, Pencil, Search, Trash2, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast, useConfirm } from '@/lib/feedback';
import { marginCls, marginOf, stockLevel } from '@/lib/admin/format';
import { normalizeHeader, parseNum } from '@/lib/admin/validate';
import type { AdminProduct, AdminVariant } from '@/types/admin';

let xlsxModule: typeof import('xlsx') | null = null;
async function getXlsx() {
  if (!xlsxModule) xlsxModule = await import('xlsx');
  return xlsxModule;
}

type EditProductForm = {
  name: string;
  sku: string;
  category: string;
  brand: string;
  basePrice: string;
  costPrice: string;
  comparePrice: string;
  description: string;
  registroIsp: string;
  reason: string;
  variants: {
    id?: string;
    variantName: string;
    sku: string;
    price: string;
    costPrice: string;
    stock: string;
    lowStockAlert: string;
  }[];
};

export function Productos({
  products,
  token,
  onChanged,
}: {
  products: AdminProduct[];
  token: string;
  onChanged: () => void;
}) {
  const [edits, setEdits] = useState<Record<string, { stock?: string; price?: string; cost?: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [editForm, setEditForm] = useState<EditProductForm | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', basePrice: '', costPrice: '', comparePrice: '', category: '', brand: '', description: '', registroIsp: '' });
  const [formVariants, setFormVariants] = useState([
    { variantName: '', sku: '', price: '', costPrice: '', stock: '', lowStockAlert: '5' },
  ]);
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const confirm = useConfirm();

  const resetPage = () => setPage(0);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => { if (p.category?.name) cats.add(p.category.name); });
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name} ${p.sku || ''} ${p.brand || ''} ${p.brandName || ''} ${p.category?.name || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (categoryFilter) {
      list = list.filter((p) => p.category?.name === categoryFilter);
    }
    if (statusFilter === 'active') list = list.filter((p) => p.active !== false);
    if (statusFilter === 'inactive') list = list.filter((p) => p.active === false);
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      if (sortBy === 'price') cmp = (a.price ?? 0) - (b.price ?? 0);
      if (sortBy === 'stock') {
        const stockA = a.variants?.reduce((s, v) => s + (v.stock ?? 0), 0) ?? 0;
        const stockB = b.variants?.reduce((s, v) => s + (v.stock ?? 0), 0) ?? 0;
        cmp = stockA - stockB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [products, search, categoryFilter, statusFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const pagedProducts = useMemo(() => {
    return filteredProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filteredProducts, page]);

  const setEdit = (variantId: string, field: 'stock' | 'price' | 'cost', value: string) => {
    setEdits((d) => ({ ...d, [variantId]: { ...d[variantId], [field]: value } }));
  };

  const save = async (p: AdminProduct, v: AdminVariant, current: number) => {
    const e = edits[v.id];
    const stockRaw = e?.stock;
    const priceRaw = e?.price;
    const costRaw = e?.cost;

    if (stockRaw !== undefined) {
      const next = Number(stockRaw);
      if (Number.isNaN(next) || next < 0) {
        toast.error('El valor de stock no es válido (debe ser un número ≥ 0).');
        return;
      }
    }
    setSaving(v.id);
    try {
      const apiCalls: Promise<any>[] = [];
      if (stockRaw !== undefined) {
        const next = Number(stockRaw);
        if (next !== current) {
          apiCalls.push(apiFetch(`/products/${v.id}/stock`, { method: 'PATCH', token, body: { quantity: next - current } }));
        }
      }
      if (priceRaw !== undefined) {
        const next = Number(priceRaw);
        if (!Number.isNaN(next) && next >= 0 && next !== v.price) {
          apiCalls.push(apiFetch(`/products/${v.id}/price`, { method: 'PATCH', token, body: { price: next } }));
        }
      }
      if (costRaw !== undefined) {
        const next = Number(costRaw);
        if (!Number.isNaN(next) && next >= 0 && next !== v.costPrice) {
          apiCalls.push(apiFetch(`/products/${p.id}`, { method: 'PATCH', token, body: { variants: [{ id: v.id, costPrice: next }] } }));
        }
      }
      if (apiCalls.length > 0) await Promise.all(apiCalls);
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar.');
    } finally {
      setEdits((d) => { const n = { ...d }; delete n[v.id]; return n; });
      try { await onChanged(); } catch {}
      setSaving(null);
    }
  };

  const setVariant = (i: number, field: string, value: string) =>
    setFormVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)));

  const create = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre del producto es obligatorio.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/products', {
        method: 'POST',
        token,
        body: {
          name: form.name,
          sku: form.sku,
          basePrice: Number(form.basePrice) || undefined,
          costPrice: Number(form.costPrice) || undefined,
          comparePrice: Number(form.comparePrice) || undefined,
          category: form.category,
          brand: form.brand,
          description: form.description,
          registroIsp: form.registroIsp,
          variants: formVariants
            .filter((v) => v.variantName.trim() || v.sku.trim())
            .map((v) => ({
              variantName: v.variantName,
              sku: v.sku,
              price: Number(v.price) || undefined,
              costPrice: Number(v.costPrice) || undefined,
              stock: Number(v.stock) || 0,
              lowStockAlert: Number(v.lowStockAlert) || 5,
            })),
        },
      });
      setShowForm(false);
      setForm({ name: '', sku: '', basePrice: '', costPrice: '', comparePrice: '', category: '', brand: '', description: '', registroIsp: '' });
      setFormVariants([{ variantName: '', sku: '', price: '', costPrice: '', stock: '', lowStockAlert: '5' }]);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    setEditForm({
      name: p.name,
      sku: p.sku || '',
      category: p.category?.name || '',
      brand: String(p.brand || ''),
      basePrice: String(p.price ?? ''),
      costPrice: String(p.costPrice ?? 0),
      comparePrice: String(p.comparePrice ?? ''),
      description: p.description || '',
      registroIsp: p.registroIsp || '',
      reason: '',
      variants: (p.variants || []).map((v) => ({
        id: v.id,
        variantName: v.name,
        sku: v.sku,
        price: String(v.price ?? ''),
        costPrice: String(v.costPrice ?? 0),
        stock: String(v.stock ?? 0),
        lowStockAlert: String(v.lowStockAlert ?? 5),
      })),
    });
  };

  const setEditVariant = (i: number, field: string, value: string) =>
    setEditForm((f) =>
      f
        ? {
            ...f,
            variants: f.variants.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)),
          }
        : f,
    );

  const saveEdit = async () => {
    if (!editing || !editForm) return;
    if (!editForm.name.trim()) {
      toast.error('El nombre del producto es obligatorio.');
      return;
    }
    const stockChanges = editForm.variants
      .map((v) => ({ id: v.id, old: (editing.variants || []).find((x) => x.id === v.id)?.stock ?? 0, next: Number(v.stock) || 0 }))
      .filter((s) => s.id && s.next !== s.old);

    if (stockChanges.length > 0 && !editForm.reason.trim()) {
      toast.error('Los cambios de stock necesitan un motivo (campo "Motivo de ajuste de stock").');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/products/${editing.id}`, {
        method: 'PATCH',
        token,
        body: {
          name: editForm.name,
          sku: editForm.sku,
          category: editForm.category,
          brand: editForm.brand,
          basePrice: Number(editForm.basePrice) || undefined,
          costPrice: Number(editForm.costPrice) || undefined,
          comparePrice: Number(editForm.comparePrice) || undefined,
          description: editForm.description,
          registroIsp: editForm.registroIsp,
          variants: editForm.variants.map((v) => ({
            id: v.id,
            variantName: v.variantName,
            sku: v.sku,
            price: Number(v.price) || undefined,
            costPrice: Number(v.costPrice) || undefined,
            lowStockAlert: Number(v.lowStockAlert) || 5,
          })),
        },
      });

      for (const sc of stockChanges) {
        await apiFetch(`/products/${sc.id}/adjust-stock`, {
          method: 'PATCH',
          token,
          body: { newStock: sc.next, reason: editForm.reason },
        });
      }

      setEditing(null);
      setEditForm(null);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (p: AdminProduct) => {
    const ok = await confirm({
      title: 'Desactivar producto',
      message: `¿Desactivar el producto "${p.name}"? No se eliminará del historial de ventas.`,
      cancelLabel: 'No',
      confirmLabel: 'Sí, desactivar',
      danger: true,
    });
    if (!ok) return;
    setDeleting(p.id);
    try {
      await apiFetch(`/products/${p.id}`, { method: 'DELETE', token });
      await onChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar el producto.');
    } finally {
      setDeleting(null);
    }
  };

  const exportExcel = async () => {
    const rows: Record<string, unknown>[] = [];
    for (const p of filteredProducts) {
      const base = {
        producto: p.name,
        sku_producto: p.sku || '',
        categoria: p.category?.name || '',
        marca: p.brand || '',
        precio_base: p.price ?? '',
        costo_base: p.costPrice ?? '',
        precio_tachado: p.comparePrice ?? '',
        descripcion: p.description || '',
      };
      const vs = p.variants && p.variants.length > 0 ? p.variants : [];
      if (vs.length === 0) {
        rows.push({ ...base, variante: '', sku_variante: '', precio_variante: '', costo_variante: '', stock: '', alerta_stock: '' });
      } else {
        for (const v of vs) {
          rows.push({ ...base, variante: v.name, sku_variante: v.sku, precio_variante: v.price ?? '', costo_variante: v.costPrice ?? '', stock: v.stock ?? '', alerta_stock: v.lowStockAlert ?? '' });
        }
      }
    }
    const XLSX = await getXlsx();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    const d = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `nutrifit-productos-${d}.xlsx`);
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const XLSX = await getXlsx();
      const buffer = await file.arrayBuffer();
      let wb: import('xlsx').WorkBook;
      if (/\.csv$/i.test(file.name)) {
        const head = new TextDecoder().decode(new Uint8Array(buffer).slice(0, 16384)).split(/\r?\n/)[0] || '';
        const semi = (head.match(/;/g) || []).length;
        const comma = (head.match(/,/g) || []).length;
        const tab = (head.match(/\t/g) || []).length;
        const FS = semi > comma && semi >= tab ? ';' : tab > comma && tab >= semi ? '\t' : ',';
        wb = XLSX.read(buffer, { type: 'array', FS, raw: true });
      } else {
        wb = XLSX.read(buffer, { type: 'array', raw: true });
      }
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet || !sheet['!ref']) {
        setImportResult({ ok: false, msg: 'El archivo está vacío o no tiene datos.' });
        return;
      }
      let rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (rows.length === 0) {
        setImportResult({ ok: false, msg: 'El archivo está vacío o no tiene datos.' });
        return;
      }
      const header = Object.keys(rows[0]).reduce<Record<string, string>>((acc, k) => {
        acc[normalizeHeader(k)] = k;
        return acc;
      }, {});
      const get = (r: Record<string, unknown>, key: string) => r[header[key] ?? ''] ?? '';
      const grouped = new Map<string, Record<string, unknown>[]>();
      for (const r of rows) {
        const sku = String(get(r, 'sku_producto') || '').trim();
        const key = sku || `name:${String(get(r, 'producto') || '').trim().toLowerCase()}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)?.push(r);
      }
      let created = 0;
      let updated = 0;
      let errors = 0;
      let lastError = '';
      for (const [, rs] of grouped) {
        const first = rs[0];
        const skuP = String(get(first, 'sku_producto') || '').trim();
        const nameP = String(get(first, 'producto') || '').trim();
        const existing = skuP
          ? products.find((p) => p.sku && p.sku.toLowerCase() === skuP.toLowerCase())
          : products.find((p) => p.name.toLowerCase() === nameP.toLowerCase());
        const variants = rs
          .filter((r) => String(get(r, 'sku_variante') || '').trim() || String(get(r, 'variante') || '').trim())
          .map((r) => ({
            variantName: String(get(r, 'variante') || '').trim(),
            sku: String(get(r, 'sku_variante') || '').trim(),
            price: parseNum(get(r, 'precio_variante')),
            costPrice: parseNum(get(r, 'costo_variante')),
            stock: parseNum(get(r, 'stock')),
            lowStockAlert: parseNum(get(r, 'alerta_stock')),
          }));
        try {
          if (existing) {
            const existingVariants = existing.variants || [];
            const variantPayload = variants.map((v) => {
              const match = existingVariants.find((ev) => v.sku && ev.sku && ev.sku.toLowerCase() === v.sku.toLowerCase());
              return { ...v, id: match?.id ?? undefined };
            });
            await apiFetch(`/products/${existing.id}`, {
              method: 'PATCH',
              token,
              body: {
                name: nameP || existing.name,
                sku: skuP || undefined,
                category: String(get(first, 'categoria') || '').trim() || undefined,
                brand: String(get(first, 'marca') || '').trim() || undefined,
                basePrice: parseNum(get(first, 'precio_base')),
                costPrice: parseNum(get(first, 'costo_base')),
                comparePrice: parseNum(get(first, 'precio_tachado')),
                description: String(get(first, 'descripcion') || '').trim() || undefined,
                variants: variantPayload,
              },
            });
            updated++;
          } else {
            await apiFetch('/products', {
              method: 'POST',
              token,
              body: {
                name: nameP,
                sku: skuP || undefined,
                category: String(get(first, 'categoria') || 'Otros').trim(),
                brand: String(get(first, 'marca') || '').trim() || undefined,
                basePrice: parseNum(get(first, 'precio_base')),
                costPrice: parseNum(get(first, 'costo_base')),
                comparePrice: parseNum(get(first, 'precio_tachado')),
                description: String(get(first, 'descripcion') || '').trim() || undefined,
                variants,
              },
            });
            created++;
          }
        } catch (err: any) {
          errors++;
          const detail = err?.message || err?.statusText || 'Error desconocido';
          lastError = `${nameP || skuP || '?'}: ${detail}`;
        }
      }
      const summary = errors === 0
        ? `Importación lista: ${created} creado(s), ${updated} actualizado(s).`
        : `Importación: ${created} creado(s), ${updated} actualizado(s), ${errors} con error.${lastError ? '\n' + lastError : ''}`;
      setImportResult({ ok: errors === 0, msg: summary });
      await onChanged();
    } catch (err: any) {
      setImportResult({ ok: false, msg: err?.message || 'No se pudo leer el archivo. Revisa que sea un .xlsx o .csv válido.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {search || categoryFilter || statusFilter !== 'all'
            ? `${filteredProducts.length} de ${products.length} producto(s)`
            : `${products.length} producto(s)`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              placeholder="Buscar…"
              className="input pl-8 py-2 text-sm max-w-[160px]"
            />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); resetPage(); }}
              className="input py-2 text-sm pr-6 appearance-none"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); resetPage(); }}
              className="input py-2 text-sm pr-6 appearance-none"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <button
            onClick={() => { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); }}
            className="btn-outline px-2 py-2 text-xs"
            title={`Ordenar por ${sortBy} ${sortDir === 'asc' ? 'descendente' : 'ascendente'}`}
          >
            {sortDir === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                handleImportFile(f);
                e.target.value = '';
              }
            }}
          />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-outline px-3 py-2 text-xs disabled:opacity-50">
            {importing ? 'Importando…' : 'Importar'}
          </button>
          <button onClick={exportExcel} className="btn-outline px-3 py-2 text-xs">
            Exportar {filteredProducts.length < products.length ? `(${filteredProducts.length})` : ''}
          </button>
          <button onClick={() => setShowForm((s) => !s)} className="btn-accent px-4 py-2 text-xs">
            {showForm ? 'Cancelar' : '+ Nuevo'}
          </button>
        </div>
      </div>

      {importResult && (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${importResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {importResult.msg}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-3xl border border-line bg-paper p-6">
          <p className="font-display text-lg uppercase">Nuevo producto</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre *" className="input md:col-span-2" />
            <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="SKU (opcional)" className="input" />
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Categoría * (ej: Whey Protein)" className="input" />
            <input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Marca (ej: FullEnergic)" className="input" />
            <input value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} placeholder="Precio base" type="number" className="input" />
            <input value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))} placeholder="Costo (para margen)" type="number" className="input" />
            <input value={form.comparePrice} onChange={(e) => setForm((f) => ({ ...f, comparePrice: e.target.value }))} placeholder="Precio tachado (opcional)" type="number" className="input" />
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción (opcional)" className="input md:col-span-2" rows={2} />
            <input value={form.registroIsp} onChange={(e) => setForm((f) => ({ ...f, registroIsp: e.target.value }))} placeholder="Registro ISP N° (opcional)" className="input" />
          </div>

          <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-muted">Variantes</p>
          <div className="mt-2 space-y-2">
            {formVariants.map((v, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-7">
                <input value={v.variantName} onChange={(e) => setVariant(i, 'variantName', e.target.value)} placeholder="Variante (ej: Vainilla 1kg)" className="input md:col-span-2" />
                <input value={v.sku} onChange={(e) => setVariant(i, 'sku', e.target.value)} placeholder="SKU" className="input" />
                <input value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} placeholder="Precio" type="number" className="input" />
                <input value={v.costPrice} onChange={(e) => setVariant(i, 'costPrice', e.target.value)} placeholder="Costo" type="number" className="input" />
                <input value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} placeholder="Stock" type="number" className="input" />
                <div className="flex items-center gap-2">
                  <input value={v.lowStockAlert} onChange={(e) => setVariant(i, 'lowStockAlert', e.target.value)} placeholder="Alerta" type="number" className="input" />
                  <button onClick={() => setFormVariants((vs) => vs.filter((_, idx) => idx !== i))} disabled={formVariants.length === 1} className="inline-flex items-center justify-center rounded-full p-1 text-red-500 transition hover:bg-red-50 disabled:opacity-30" title="Quitar variante">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setFormVariants((vs) => [...vs, { variantName: '', sku: '', price: '', costPrice: '', stock: '', lowStockAlert: '5' }])} className="mt-2 text-xs font-bold text-accent">
            + Agregar variante
          </button>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-xs">
              Cancelar
            </button>
            <button onClick={create} disabled={submitting} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
              {submitting ? 'Guardando…' : 'Guardar producto'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {pagedProducts.map((p) => {
          const variants = p.variants && p.variants.length > 0 ? p.variants : [];
          return (
            <div key={p.id} className="overflow-hidden rounded-3xl border border-line bg-paper">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-soft/50 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold leading-snug">{p.name || p.sku || 'Producto sin nombre'}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {[p.sku, p.brandName, p.category?.name].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {!p.active && <span className="text-[11px] font-bold text-red-500">INACTIVO</span>}
                  <button
                    onClick={() => openEdit(p)}
                    className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-2 text-[11px] font-bold text-ink hover:border-accent min-h-[44px]"
                  >
                    <Pencil size={10} /> Editar
                  </button>
                  <button
                    onClick={() => remove(p)}
                    disabled={deleting === p.id}
                    className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-2 text-[11px] font-bold text-red-700 disabled:opacity-50 min-h-[44px]"
                  >
                    <Trash2 size={10} /> {deleting === p.id ? '…' : 'Desactivar'}
                  </button>
                </div>
              </div>

              {variants.length > 0 ? (
                <div className="px-4 py-3">
                  <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_auto] md:items-end md:gap-3">
                    <div className="border-b border-line pb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Variante</div>
                    <div className="border-b border-line pb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Precio</div>
                    <div className="border-b border-line pb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Costo</div>
                    <div className="border-b border-line pb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Stock</div>
                    <div className="border-b border-line pb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Margen</div>
                    <div className="border-b border-line pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-muted">Acciones</div>
                  </div>
                  <div className="divide-y divide-line/60">
                    {variants.map((v) => {
                      const lvl = stockLevel(v.stock, v.lowStockAlert);
                      return (
                        <div key={v.id} className="flex flex-col gap-2 py-3 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_auto] md:items-end md:gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{v.name}</p>
                            <p className="truncate font-mono text-[11px] text-muted">{v.sku || '—'}</p>
                          </div>
                          <label className="block">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted md:hidden">Precio</span>
                            <input
                              type="number"
                              value={edits[v.id]?.price ?? v.price}
                              disabled={saving === v.id}
                              onChange={(e) => setEdit(v.id, 'price', e.target.value)}
                              className="input w-full py-1.5 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted md:hidden">Costo</span>
                            <input
                              type="number"
                              value={edits[v.id]?.cost ?? v.costPrice}
                              disabled={saving === v.id}
                              onChange={(e) => setEdit(v.id, 'cost', e.target.value)}
                              className="input w-full py-1.5 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted md:hidden">Stock</span>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const raw = edits[v.id]?.stock;
                                const displayStock = raw !== undefined ? (Number(raw) || 0) : v.stock;
                                const isInvalid = raw !== undefined && (Number.isNaN(Number(raw)) || Number(raw) < 0);
                                const lvlEdit = raw !== undefined ? stockLevel(displayStock, v.lowStockAlert) : lvl;
                                return (
                                  <>
                                    <input
                                      type="number"
                                      value={raw ?? v.stock}
                                      disabled={saving === v.id}
                                      onChange={(e) => setEdit(v.id, 'stock', e.target.value)}
                                      className={`input w-full py-1.5 text-sm ${isInvalid ? 'border-red-400 text-red-600' : lvlEdit.cls}`}
                                    />
                                    <span className={`shrink-0 text-[11px] font-bold ${isInvalid ? 'text-red-600' : lvlEdit.cls}`}>
                                      {isInvalid ? 'inválido' : lvlEdit.label}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </label>
                          {(() => {
                            const m = marginOf(v.price, v.costPrice);
                            return (
                              <span className={`w-fit rounded-full border bg-soft px-2 py-0.5 text-[11px] font-bold ${marginCls(m)}`}>
                                margen {m}%
                              </span>
                            );
                          })()}
                          <div className="flex justify-end">
                            <button
                              disabled={saving === v.id}
                              onClick={() => save(p, v, v.stock)}
                              className="btn-accent px-4 py-1.5 text-[11px] disabled:opacity-50"
                            >
                              {saving === v.id ? 'Guardando…' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="px-4 py-4 text-center text-xs text-muted">Sin variantes registradas.</p>
              )}
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            {products.length === 0 ? 'Sin productos.' : 'No hay resultados para tu búsqueda.'}
          </p>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-outline px-3 py-1.5 text-xs disabled:opacity-30"
            >
              ← Anterior
            </button>
            <span className="text-xs text-muted">
              Página {page + 1} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-outline px-3 py-1.5 text-xs disabled:opacity-30"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {editing && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-paper p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-xl uppercase">Editar producto</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input value={editForm.name} onChange={(e) => setEditForm((f) => (f ? { ...f, name: e.target.value } : f))} placeholder="Nombre *" className="input md:col-span-2" />
              <input value={editForm.sku} onChange={(e) => setEditForm((f) => (f ? { ...f, sku: e.target.value } : f))} placeholder="SKU" className="input" />
              <input value={editForm.category} onChange={(e) => setEditForm((f) => (f ? { ...f, category: e.target.value } : f))} placeholder="Categoría" className="input" />
              <input value={editForm.brand} onChange={(e) => setEditForm((f) => (f ? { ...f, brand: e.target.value } : f))} placeholder="Marca" className="input" />
              <input value={editForm.basePrice} onChange={(e) => setEditForm((f) => (f ? { ...f, basePrice: e.target.value } : f))} placeholder="Precio base" type="number" className="input" />
              <input value={editForm.costPrice} onChange={(e) => setEditForm((f) => (f ? { ...f, costPrice: e.target.value } : f))} placeholder="Costo" type="number" className="input" />
              <input value={editForm.comparePrice} onChange={(e) => setEditForm((f) => (f ? { ...f, comparePrice: e.target.value } : f))} placeholder="Precio tachado" type="number" className="input" />
              <input value={editForm.reason} onChange={(e) => setEditForm((f) => (f ? { ...f, reason: e.target.value } : f))} placeholder="Motivo de ajuste de stock (si cambias stock)" className="input md:col-span-2" />
              <textarea value={editForm.description} onChange={(e) => setEditForm((f) => (f ? { ...f, description: e.target.value } : f))} placeholder="Descripción" className="input md:col-span-2" rows={2} />
              <input value={editForm.registroIsp} onChange={(e) => setEditForm((f) => (f ? { ...f, registroIsp: e.target.value } : f))} placeholder="Registro ISP N°" className="input" />
            </div>

            <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-muted">Variantes</p>
            <div className="mt-2 space-y-2">
              {editForm.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-6">
                  <input value={v.variantName} onChange={(e) => setEditVariant(i, 'variantName', e.target.value)} placeholder="Variante" className="input md:col-span-2" />
                  <input value={v.sku} onChange={(e) => setEditVariant(i, 'sku', e.target.value)} placeholder="SKU" className="input" />
                  <input value={v.price} onChange={(e) => setEditVariant(i, 'price', e.target.value)} placeholder="Precio" type="number" className="input" />
                  <input value={v.costPrice} onChange={(e) => setEditVariant(i, 'costPrice', e.target.value)} placeholder="Costo" type="number" className="input" />
                  <div className="flex items-center gap-2">
                    <input value={v.stock} onChange={(e) => setEditVariant(i, 'stock', e.target.value)} placeholder="Stock" type="number" className="input" />
                    <input value={v.lowStockAlert} onChange={(e) => setEditVariant(i, 'lowStockAlert', e.target.value)} placeholder="Alerta" type="number" className="input w-20" />
                    <button
                      onClick={() => setEditForm((f) => (f ? { ...f, variants: f.variants.filter((_, idx) => idx !== i) } : f))}
                      disabled={editForm.variants.length === 1}
                      className="inline-flex items-center justify-center rounded-full p-1 text-red-500 transition hover:bg-red-50 disabled:opacity-30"
                      title="Quitar variante"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                setEditForm((f) => (f ? { ...f, variants: [...f.variants, { variantName: '', sku: '', price: '', costPrice: '', stock: '', lowStockAlert: '5' }] } : f))
              }
              className="mt-2 text-xs font-bold text-accent"
            >
              + Agregar variante
            </button>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-outline px-4 py-2 text-xs">
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={submitting} className="btn-accent px-4 py-2 text-xs disabled:opacity-50">
                {submitting ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}