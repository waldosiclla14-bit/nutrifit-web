export type Product = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  category: string;
  categoryLabel: string;
  price: number;
  oldPrice?: number;
  desc: string;
  benefits: string[];
  stock: number;
  rating: number;
  reviews: number;
  badge?: string;
  image: string;
  modoUso: string;
  nutrientes: Array<[string, string]>;
  ingredientes: string[];
  goal: string[];
  tags: string[];
  bestseller?: boolean;
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
};

export type Review = {
  name: string;
  rating: number;
  text: string;
};

export type UserReview = {
  id: string;
  productId: number;
  name: string;
  rating: number;
  text: string;
  createdAt: number;
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
};

export type OrderItem = {
  productId: number;
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
  metroLine?: string;
  metroStation?: string;
  payment?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
};

export type Settings = {
  whatsapp: string;
  freeShippingFrom: number;
  shipping: number;
};
