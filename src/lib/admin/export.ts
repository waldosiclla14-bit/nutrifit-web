import type { AdminReport } from '@/types/admin';

export function exportCSV(orders: AdminReport['orders']) {
  const rows = [
    ['Pedido', 'Cliente', 'Fecha', 'Método', 'Subtotal', 'Descuento', 'Envío', 'Total', 'Utilidad', 'Margen%'],
    ...orders.map((o) => [
      o.orderNumber,
      o.customerName,
      new Date(o.createdAt).toLocaleString('es-CL'),
      o.paymentMethod || '',
      String(o.subtotal),
      String(o.discount),
      String(o.shippingCost),
      String(o.total),
      String(o.profit),
      String(o.margin),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reporte-ventas.csv';
  a.click();
  URL.revokeObjectURL(url);
}