import { useLocation, useNavigate } from 'react-router-dom';
import { useCart, useSetCartQuantity } from '../api/hooks';
import type { Product } from '../api/types';
import { useAuth } from '../auth/AuthContext';

/**
 * Add some of a product to the cart, on top of what's already there.
 * Guests are sent to sign in first (the API keeps carts per account).
 */
export function useAddToCart() {
  const { user } = useAuth();
  const { data: cart } = useCart(user !== null);
  const setQuantity = useSetCartQuantity();
  const navigate = useNavigate();
  const location = useLocation();

  const inCart = (productId: string) =>
    cart?.items.find((i) => i.product.id === productId)?.quantity ?? 0;

  const add = (product: Pick<Product, 'id' | 'stock'>, quantity = 1) => {
    if (!user) {
      navigate('/login', {
        state: { from: location.pathname + location.search },
      });
      return;
    }
    setQuantity.mutate({
      productId: product.id,
      quantity: Math.min(product.stock, inCart(product.id) + quantity),
    });
  };

  return {
    add,
    inCart,
    pending: setQuantity.isPending,
    error: setQuantity.error,
    lastAdded: setQuantity.isSuccess
      ? setQuantity.variables?.productId
      : undefined,
    reset: setQuantity.reset,
  };
}
