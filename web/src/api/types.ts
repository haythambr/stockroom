// Shapes returned by the Stockroom API. Money is always in cents.

export type Role = 'CUSTOMER' | 'ADMIN';
export type OrderStatus =
  'PENDING_PAYMENT' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  stock: number;
  isActive?: boolean;
  category: { id: string; name: string; slug: string };
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CartLine {
  product: Pick<
    Product,
    'id' | 'sku' | 'name' | 'slug' | 'priceCents' | 'stock'
  > & { isActive: boolean; category: { slug: string } };
  quantity: number;
  lineTotalCents: number;
  problem: string | null;
}

export interface Cart {
  items: CartLine[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  canCheckout: boolean;
}

export interface Address {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingAddress: Address;
  expiresAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  items: OrderItem[];
  user?: { id: string; name: string; email: string };
}

export interface StockMovement {
  id: string;
  change: number;
  reason: 'RESTOCK' | 'ADJUSTMENT' | 'ORDER' | 'CANCEL';
  orderId: string | null;
  note: string | null;
  createdAt: string;
}
