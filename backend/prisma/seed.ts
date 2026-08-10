import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Contraseñas forzadas por defecto para restablecer el acceso al panel.
  // (No dependen de env: en producción Render podría tener SEED_*_PASSWORD
  //  con un valor desconocido que bloqueaba el login.)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const sellerPassword = await bcrypt.hash('vendedor123', 10);

  // Usuario admin
  await prisma.user.upsert({
    where: { email: 'admin@nutrifit.cl' },
    update: {
      name: 'Administrador',
      role: 'ADMIN',
      password: adminPassword,
    },
    create: {
      email: 'admin@nutrifit.cl',
      name: 'Administrador',
      role: 'ADMIN',
      password: adminPassword,
    },
  });

  // Usuario vendedor
  await prisma.user.upsert({
    where: { email: 'vendedor@nutrifit.cl' },
    update: {
      name: 'Vendedor POS',
      role: 'SELLER',
      password: sellerPassword,
    },
    create: {
      email: 'vendedor@nutrifit.cl',
      name: 'Vendedor POS',
      role: 'SELLER',
      password: sellerPassword,
    },
  });

  // Categorías
  const categories = [
    { name: 'Whey Protein', slug: 'whey-protein', description: 'Proteína de suero de leche' },
    { name: 'Creatina', slug: 'creatina', description: 'Monohidrato de creatina' },
    { name: 'Vitaminas', slug: 'vitaminas', description: 'Multivitamínicos y minerales' },
    { name: 'Omega 3', slug: 'omega-3', description: 'Ácidos grasos esenciales' },
    { name: 'Pre-Entreno', slug: 'pre-entreno', description: 'Energía y focus' },
    { name: 'Bienestar', slug: 'bienestar', description: 'Salud general' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // Marca
  const brand = await prisma.brand.upsert({
    where: { slug: 'fullenergic' },
    update: {},
    create: {
      name: 'FullEnergic',
      slug: 'fullenergic',
      logoUrl: 'https://nutrifit-web-nu.vercel.app/logo-fullenergic.png',
    },
  });

  // Productos de ejemplo
  const wheyCat = await prisma.category.findUnique({ where: { slug: 'whey-protein' } });
  const creatinaCat = await prisma.category.findUnique({ where: { slug: 'creatina' } });

  if (wheyCat) {
    const whey = await prisma.product.upsert({
      where: { sku: 'FE-WHEY-001' },
      update: {},
      create: {
        sku: 'FE-WHEY-001',
        name: '100% Whey Protein',
        slug: '100-whey-protein',
        description: 'Proteína de suero de leche de alta calidad. Fácil de preparar, rápido aumento muscular sin grasas.',
        basePrice: 24990,
        comparePrice: 29990,
        imageUrl: 'https://nutrifit-web-nu.vercel.app/products/whey-protein.png',
        isActive: true,
        isFeatured: true,
        categoryId: wheyCat.id,
        brandId: brand.id,
      },
    });

    await prisma.productVariant.upsert({
      where: { sku: 'FE-WHEY-001-VAN-1KG' },
      update: {},
      create: {
        productId: whey.id,
        sku: 'FE-WHEY-001-VAN-1KG',
        variantName: 'Vainilla 1kg',
        attributes: { sabor: 'vainilla', peso: '1kg' },
        price: 24990,
        stock: 15,
        lowStockAlert: 5,
      },
    });

    await prisma.productVariant.upsert({
      where: { sku: 'FE-WHEY-001-CHOC-1KG' },
      update: {},
      create: {
        productId: whey.id,
        sku: 'FE-WHEY-001-CHOC-1KG',
        variantName: 'Chocolate 1kg',
        attributes: { sabor: 'chocolate', peso: '1kg' },
        price: 24990,
        stock: 12,
        lowStockAlert: 5,
      },
    });

    await prisma.productVariant.upsert({
      where: { sku: 'FE-WHEY-001-CK-1KG' },
      update: {},
      create: {
        productId: whey.id,
        sku: 'FE-WHEY-001-CK-1KG',
        variantName: 'Cookies & Cream 1kg',
        attributes: { sabor: 'cookies', peso: '1kg' },
        price: 25990,
        stock: 8,
        lowStockAlert: 3,
      },
    });
  }

  if (creatinaCat) {
    const creatina = await prisma.product.upsert({
      where: { sku: 'FE-CREAT-001' },
      update: {},
      create: {
        sku: 'FE-CREAT-001',
        name: 'Full Creatine',
        slug: 'full-creatine',
        description: 'Creatina 100% Pure Micronized Monohydrate. 5g por servicio, 60 servicios.',
        basePrice: 14990,
        comparePrice: 18990,
        imageUrl: 'https://nutrifit-web-nu.vercel.app/products/creatine.png',
        isActive: true,
        isFeatured: true,
        categoryId: creatinaCat.id,
        brandId: brand.id,
      },
    });

    await prisma.productVariant.upsert({
      where: { sku: 'FE-CREAT-001-300G' },
      update: {},
      create: {
        productId: creatina.id,
        sku: 'FE-CREAT-001-300G',
        variantName: '300g Sin Sabor',
        attributes: { peso: '300g', sabor: 'sin sabor' },
        price: 14990,
        stock: 20,
        lowStockAlert: 5,
      },
    });
  }

  console.log('✅ Seed completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
