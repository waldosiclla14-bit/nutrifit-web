import { isValidSku, normalizeSku, skuError } from './sku';

describe('normalizeSku', () => {
  it('mayúsculas, sin tildes, espacios → guiones', () => {
    expect(normalizeSku('  óxido nítrico ')).toBe('OXIDO-NITRICO');
    expect(normalizeSku('melena de león')).toBe('MELENA-DE-LEON');
    expect(normalizeSku('nf-prot-fe-whey-1kg')).toBe('NF-PROT-FE-WHEY-1KG');
  });

  it('elimina caracteres no admitidos', () => {
    expect(normalizeSku('NF/PROT (1kg)')).toBe('NF-PROT-1KG');
  });
});

describe('isValidSku', () => {
  it('acepta formato NF-<CAT>-<PROD>-<TAMAÑO>', () => {
    expect(isValidSku('NF-PROT-FE-WHEY-1KG')).toBe(true);
    expect(isValidSku('A'.repeat(50))).toBe(true);
  });

  it('rechaza vacío, espacios, tildes, largo y caracteres inválidos', () => {
    expect(isValidSku('')).toBe(false);
    expect(isValidSku(null)).toBe(false);
    expect(isValidSku(undefined)).toBe(false);
    expect(isValidSku('NF PROT')).toBe(false);
    expect(isValidSku('nf-prot')).toBe(false);
    expect(isValidSku('NF-ÓXIDO')).toBe(false);
    expect(isValidSku('A'.repeat(51))).toBe(false);
    expect(isValidSku('NF/PROT')).toBe(false);
  });
});

describe('skuError', () => {
  it('mensajes claros por caso', () => {
    expect(skuError('')).toBe('El SKU es obligatorio.');
    expect(skuError('A'.repeat(51))).toContain('50 caracteres');
    expect(skuError('nf-prot')).toContain('mayúsculas');
    expect(skuError('NF-PROT-FE-WHEY-1KG')).toBeNull();
  });
});
