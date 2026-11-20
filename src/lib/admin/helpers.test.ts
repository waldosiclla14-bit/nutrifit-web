import { mapApiProduct } from './helpers';

describe('mapApiProduct', () => {
  it('conserva ISP, proveedor, imagen y slug para editar/duplicar', () => {
    const mapped = mapApiProduct({
      id: 'p1',
      name: 'Whey 1kg',
      slug: 'whey-1kg',
      sku: 'W-1K',
      registroIsp: 'ISP-12345',
      imageUrl: 'https://cdn.example.com/whey.jpg',
      size: '1 kg',
      servings: 30,
      ingredients: 'Proteína de suero',
      descriptionShort: 'Whey de rápida absorción',
      seoTitle: 'Whey 1kg | FullEnergic',
      supplier: { id: 's1', name: 'Proveedor' },
      supplierId: 's1',
      basePrice: 29990,
      costPrice: 18000,
      brand: { id: 'b1', name: 'FullEnergic' },
      category: { id: 'c1', name: 'Proteína' },
      variants: [{ id: 'v1', variantName: 'Vainilla', sku: 'W-1K-V', physicalStock: 4, price: 29990, costPrice: 18000, lowStockAlert: 5 }],
    });

    expect(mapped.registroIsp).toBe('ISP-12345');
    expect(mapped.imageUrl).toBe('https://cdn.example.com/whey.jpg');
    expect(mapped.size).toBe('1 kg');
    expect(mapped.servings).toBe(30);
    expect(mapped.ingredients).toBe('Proteína de suero');
    expect(mapped.descriptionShort).toBe('Whey de rápida absorción');
    expect(mapped.seoTitle).toBe('Whey 1kg | FullEnergic');
    expect(mapped.supplierId).toBe('s1');
    expect(mapped.slug).toBe('whey-1kg');
    expect(mapped.brandName).toBe('FullEnergic');
    expect(mapped.variants?.[0]).toMatchObject({ name: 'Vainilla', stock: 4, price: 29990 });
  });

  it('usa null cuando ISP o imagen no vienen', () => {
    const mapped = mapApiProduct({ id: 'p2', name: 'Creatina' });
    expect(mapped.registroIsp).toBeNull();
    expect(mapped.imageUrl).toBeNull();
    expect(mapped.size).toBeNull();
    expect(mapped.servings).toBeNull();
    expect(mapped.ingredients).toBeNull();
    expect(mapped.descriptionShort).toBeNull();
    expect(mapped.seoTitle).toBeNull();
    expect(mapped.supplierId).toBeNull();
  });
});
