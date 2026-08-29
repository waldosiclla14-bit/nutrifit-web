export type AdminVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockAlert: number | null;
  active: boolean;
};

export type AdminBrand = { id: string; name: string; slug?: string } | null;

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
  subtotal: number;
  discount: number;
  shippingCost: number;
  deliveryType?: string;
  metroLine?: string;
  metroStation?: string;
  deliveryDay?: string;
  deliveryTime?: string;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  customer?: { id: string; name: string; phone: string } | null;
  items?: {
    id: string;
    productId?: string | null;
    variantId?: string | null;
    productName: string;
    variantName: string | null;
    sku: string;
    unitPrice: number;
    unitCost?: number;
    quantity: number;
    total: number;
  }[];
};

export type AdminProduct = {
  id: string;
  name: string;
  brandName?: string;
  brand?: AdminBrand;
  sku?: string;
  price: number;
  costPrice: number;
  stock?: number;
  active: boolean;
  comparePrice?: number | null;
  description?: string | null;
  registroIsp?: string | null;
  category?: { id: string; name: string } | null;
  variants?: AdminVariant[];
};

export type AdminCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalSpent: number;
  totalOrders: number;
  createdAt: string;
  lastOrderAt?: string | null;
  isVip?: boolean;
};

export type AdminReminder = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  title: string;
  message: string;
  dueAt: string;
  status: 'PENDING' | 'DONE';
  sentAt: string | null;
  createdAt: string;
};

export type AdminStats = {
  todaySales: number;
  todayOrders: number;
  todayProfit: number;
  todayMargin: number;
  monthSales: number;
  monthOrders: number;
  monthProfit: number;
  monthMargin: number;
  salesGrowth: number;
  avgTicket: number;
  monthAvgTicket: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  salesByDay: { date: string; total: number; profit: number; orders: number }[];
};

export type AdminGoals = {
  dailySales: number;
  monthlySales: number;
  dailyOrders: number;
  monthlyOrders: number;
  targetMargin: number;
  avgTicket: number;
};

export type AdminReport = {
  from: string;
  to: string;
  totalSales: number;
  totalProfit: number;
  margin: number;
  orderCount: number;
  avgTicket: number;
  methods: { method: string; total: number; count: number }[];
  categories: { product: string; quantity: number; total: number; profit: number }[];
  orders: {
    orderNumber: string;
    customerName: string;
    createdAt: string;
    paymentMethod: string | null;
    subtotal: number;
    discount: number;
    shippingCost: number;
    total: number;
    profit: number;
    margin: number;
  }[];
};

export type AdminCashRegister = {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  initialAmount: number;
  finalAmount: number | null;
  expectedAmount: number | null;
  diff: number | null;
  openedBy?: { name: string } | null;
};

export type AdminInventoryValue = {
  totalCost: number;
  totalRetail: number;
  totalItems: number;
  potentialProfit: number;
  avgMargin: number;
};
