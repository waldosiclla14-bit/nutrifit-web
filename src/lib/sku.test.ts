import { generateSku, isValidSku, normalizeSku, skuError } from './sku';

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

describe('generateSku', () => {
  it('genera un SKU válido desde categoría y nombre', () => {
    const sku = generateSku('Whey Protein', 'Gold Standard 100% Whey');
    expect(sku).toBe('NF-WHE-GOLD-STANDARD-100-WHEY');
    expect(isValidSku(sku)).toBe(true);
    expect(skuError(sku)).toBeNull();
  });

  it('incluye el tamaño cuando se entrega', () => {
    const sku = generateSku('Creatina', 'Creatina Monohidratada', '1 kg');
    expect(sku.endsWith('-1-KG')).toBe(true);
    expect(isValidSku(sku)).toBe(true);
  });

  it('nunca supera los 50 caracteres', () => {
    const sku = generateSku('Categoría muy larga', 'Producto con un nombre extremadamente largo que no termina nunca', '2 kg');
    expect(sku.length).toBeLessThanOrEqual(50);
    expect(isValidSku(sku)).toBe(true);
  });

  it('usa tokens seguros si nombre o categoría están vacíos', () => {
    const sku = generateSku('', '');
    expect(sku).toBe('NF-GEN-PRODUCTO');
    expect(isValidSku(sku)).toBe(true);
  });

  it('elimina tildes y símbolos', () => {
    const sku = generateSku('Proteína', 'Sabor Vainilla/Chocolate');
    expect(sku).not.toMatch(/[ÁÉÍÓÚÑáéíóúñ/]/);
    expect(normalizeSku(sku)).toBe(sku);
  });
});
