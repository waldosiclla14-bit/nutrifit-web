'use client';

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function compressImage(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 500000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    let w = bmp.width;
    let h = bmp.height;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality));
    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function statusColor(s: string): string {
  switch (s) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-600';
    case 'PENDING_REVIEW':
      return 'bg-amber-100 text-amber-600';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-600';
    case 'RECEIVING':
      return 'bg-purple-100 text-purple-600';
    case 'RECEIVED':
      return 'bg-green-100 text-green-600';
    case 'CANCELLED':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function statusLabel(s: string): string {
  switch (s) {
    case 'DRAFT':
      return 'Borrador';
    case 'PENDING_REVIEW':
      return 'Pendiente revision';
    case 'CONFIRMED':
      return 'Confirmada';
    case 'RECEIVING':
      return 'Recibiendo';
    case 'RECEIVED':
      return 'Recibida';
    case 'CANCELLED':
      return 'Anulada';
    default:
      return s;
  }
}
