export type DeliveryMethod = 'metro' | 'domicilio';

export type BlueSize = 'S' | 'M';

export type ProductVariant = {
  id?: string;
  name: string;
  image: string;
  stock: number;
  sku?: string;
  reservedStock?: number;
  publicStock?: number;
  publicPublished?: boolean;
  rating?: number;
  reviews?: number;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  category: string;
  categoryLabel: string;
  price: number;
  oldPrice?: number;
  /**
   * `true` solo si el precio "antes" (`oldPrice`) es un precio realmente
   * practicado y el dueño lo confirmó. Mientras no esté en `true` no se
   * muestra tachado ni porcentaje de descuento (ver `siteConfig.offers`).
   */
  compareAtVerified?: boolean;
  desc: string;
  benefits: string[];
  stock: number;
  sku?: string;
  publicStock?: number;
  publicPublished?: boolean;
  rating: number;
  reviews: number;
  badge?: string;
  registroIsp?: string;
  image: string;
  modoUso: string;
  nutrientes: Array<[string, string]>;
  ingredientes: string[];
  goal: string[];
  tags: string[];
  bestseller?: boolean;
  newArrival?: boolean;
  /** Peso del producto en kg, para calcular la talla de envío Blue Express. */
  weightKg?: number;
  /** Medidas del embalaje en cm (largo x ancho x alto), para el peso volumétrico. */
  packageDims?: { length: number; width: number; height: number };
  variants?: ProductVariant[];
};

export type Category = {
  key: string;
  label: string;
  image: string;
  blurb: string;
};

export type Combo = {
  id: string;
  name: string;
  desc: string;
  items: string[];
  image: string;
  price: number;
  oldPrice: number;
  tag: string;
};

export type Testimonial = {
  name: string;
  role: string;
  rating: number;
  text: string;
  avatar?: string;
  verified?: boolean;
};

export type Review = {
  name: string;
  rating: number;
  text: string;
};

export type UserReview = {
  id: string;
  productSlug: string;
  name: string;
  rating: number;
  text: string;
  createdAt: number;
  verified?: boolean;
};

export type CartItem = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  price: number;
  oldPrice?: number;
  discount: number;
  image: string;
  quantity: number;
  variant?: string;       // ← añadido: para distinguish Vainilla/Frutilla/Chocolate etc.
  variantId?: number;     // ← añadido: ID real de la variante (UUID o numérico)
  isGift?: boolean;
};

export type BundleItem = { productId: number; quantity: number };

export type Bundle = {
  id: string;
  title: string;
  subtitle?: string;
  items: BundleItem[];
  pricing: 'sum' | 'fixed';
  fixedPrice?: number;
  image?: string;
  tag?: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  cta?: string;
  active: boolean;
};

export type OrderItem = {
  productId: number;
  variantId?: number;     // ← añadido
  variantName?: string;   // ← añadido
  name: string;
  price: number;
  quantity: number;
  image: string;
};

export type OrderStatus = 'nuevo' | 'en-proceso' | 'completado';

export type Order = {
  id: string;
  name: string;
  phone: string;
  deliveryMethod?: DeliveryMethod;
  metroLine?: string;
  metroStation?: string;
  address?: string;
  comuna?: string;
  blueSize?: BlueSize;
  couponCode?: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
};

export type Settings = {
  whatsapp: string;
  shipping: number;
  giftProductId?: number;
  giftThreshold?: number;
  giftLabel?: string;
  rewardThreshold?: number;
  rewardPercent?: number;
};

export type CustomerProfile = {
  name: string;
  phone: string;
  deliveryMethod?: DeliveryMethod;
  metroLine?: string;
  metroStation?: string;
  address?: string;
  comuna?: string;
  blueSize?: BlueSize;
};

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  image?: string;
  blocks: BlogBlock[];
};
