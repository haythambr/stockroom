import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { get, patch, post, put, qs } from './client';
import type {
  Address,
  Cart,
  Category,
  Order,
  OrderStatus,
  Paginated,
  Product,
  StockMovement,
} from './types';

export interface ProductFilters {
  search?: string;
  category?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  sort?: 'newest' | 'price' | '-price' | 'name';
  page?: number;
  limit?: number;
}

/* Catalog ------------------------------------------------------------------- */

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => get<Category[]>('/categories'),
    staleTime: 60_000,
  });

export const useProducts = (filters: ProductFilters) =>
  useQuery({
    queryKey: ['products', filters],
    queryFn: () => get<Paginated<Product>>(`/products${qs({ ...filters })}`),
    placeholderData: keepPreviousData,
  });

export const useProduct = (slug: string) =>
  useQuery({
    queryKey: ['product', slug],
    queryFn: () => get<Product>(`/products/${slug}`),
  });

/* Cart & orders --------------------------------------------------------------- */

export const useCart = (enabled = true) =>
  useQuery({ queryKey: ['cart'], queryFn: () => get<Cart>('/cart'), enabled });

export function useSetCartQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => put<Cart>(`/cart/items/${productId}`, { quantity }),
    onSuccess: (cart) => qc.setQueryData(['cart'], cart),
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shippingAddress: Address) =>
      post<Order>('/orders', { shippingAddress }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cart'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    // A 409 means stock changed: show the fresh cart so the customer sees what's left.
    onError: () => void qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export const useOrders = (page = 1) =>
  useQuery({
    queryKey: ['orders', page],
    queryFn: () => get<Paginated<Order>>(`/orders${qs({ page, limit: 10 })}`),
  });

export const useOrder = (id: string) =>
  useQuery({
    queryKey: ['order', id],
    queryFn: () => get<Order>(`/orders/${id}`),
  });

function useOrderMutation<T>(fn: (id: string) => Promise<T>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: ['order', id] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export const useCancelOrder = () =>
  useOrderMutation((id) => post<Order>(`/orders/${id}/cancel`));
export const useDemoPay = () =>
  useOrderMutation((id) => post<{ outcome: string }>(`/payments/demo/${id}`));

/* Admin ---------------------------------------------------------------------- */

export const useAdminOrders = (status: OrderStatus | '', page: number) =>
  useQuery({
    queryKey: ['admin', 'orders', status, page],
    queryFn: () =>
      get<Paginated<Order>>(`/admin/orders${qs({ status, page, limit: 15 })}`),
    placeholderData: keepPreviousData,
  });

export function useSetOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: OrderStatus;
      reason?: string;
    }) => patch<Order>(`/admin/orders/${id}/status`, { status, reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export const useAdminProducts = (filters: ProductFilters) =>
  useQuery({
    queryKey: ['admin', 'products', filters],
    queryFn: () =>
      get<Paginated<Product>>(`/admin/products${qs({ ...filters })}`),
    placeholderData: keepPreviousData,
  });

export const useStockHistory = (productId: string | null) =>
  useQuery({
    queryKey: ['admin', 'stock', productId],
    queryFn: () => get<StockMovement[]>(`/admin/products/${productId}/stock`),
    enabled: productId !== null,
  });

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      change,
      note,
    }: {
      id: string;
      change: number;
      note?: string;
    }) => post(`/admin/products/${id}/stock`, { change, note }),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stock', id] });
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useSetProductActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      patch(`/admin/products/${id}`, { isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
