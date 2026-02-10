import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegramAuthContext } from '@/components/TelegramAuthProvider';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  size?: string;
  color?: string;
  quantity: number;
  supplierId?: string;
  supplierName?: string;
}

interface CartItemDB {
  id: string;
  product_id: string;
  profile_id: string;
  quantity: number;
  size: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[] | null;
    sizes: string[] | null;
    colors: string[] | null;
    supplier_id: string | null;
    supplier: {
      id: string;
      shop_name: string;
    } | null;
  } | null;
}

// UUID regex for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useCart() {
  const { isAuthenticated, profile } = useTelegramAuthContext();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only treat as DB-authenticated if profile ID is a valid UUID
  const isDbAuthenticated = isAuthenticated && !!profile?.id && UUID_REGEX.test(profile.id);

  // Map DB cart item to frontend format
  const mapCartItem = (dbItem: CartItemDB): CartItem | null => {
    if (!dbItem.product) return null;
    
    return {
      id: dbItem.id,
      productId: dbItem.product_id,
      name: dbItem.product.name,
      price: dbItem.product.price,
      image: dbItem.product.images?.[0] || '/placeholder.svg',
      size: dbItem.size || undefined,
      color: dbItem.color || undefined,
      quantity: dbItem.quantity,
      supplierId: dbItem.product.supplier_id || undefined,
      supplierName: dbItem.product.supplier?.shop_name || undefined,
    };
  };

  // Fetch cart items from database
  const fetchCart = useCallback(async () => {
    if (!isDbAuthenticated || !profile?.id) {
      setItems([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(
            id, 
            name, 
            price, 
            images, 
            sizes, 
            colors,
            supplier_id,
            supplier:suppliers(id, shop_name)
          )
        `)
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mappedItems = (data as CartItemDB[])
        ?.map(mapCartItem)
        .filter((item): item is CartItem => item !== null) || [];
      
      setItems(mappedItems);
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError('Помилка завантаження кошика');
    } finally {
      setIsLoading(false);
    }
  }, [isDbAuthenticated, profile?.id]);

  // Add item to cart
  const addItem = useCallback(async (
    productId: string,
    name: string,
    price: number,
    image: string,
    size?: string,
    color?: string
  ) => {
    if (!isDbAuthenticated || !profile?.id) {
      // For non-authenticated users, store in local state only
      const existingIndex = items.findIndex(
        item => item.productId === productId && item.size === size && item.color === color
      );

      if (existingIndex > -1) {
        setItems(prev => prev.map((item, idx) => 
          idx === existingIndex 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        const newItem: CartItem = {
          id: `local-${Date.now()}`,
          productId,
          name,
          price,
          image,
          size,
          color,
          quantity: 1,
        };
        setItems(prev => [...prev, newItem]);
      }
      return true;
    }

    try {
      setError(null);

      // Check if item already exists in cart
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('profile_id', profile.id)
        .eq('product_id', productId)
        .eq('size', size || '')
        .eq('color', color || '')
        .maybeSingle();

      if (existing) {
        // Update quantity
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existing.quantity + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            profile_id: profile.id,
            product_id: productId,
            quantity: 1,
            size: size || null,
            color: color || null,
          });

        if (insertError) throw insertError;
      }

      await fetchCart();
      return true;
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError('Помилка додавання до кошика');
      return false;
    }
  }, [isDbAuthenticated, profile?.id, items, fetchCart]);

  // Update item quantity
  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return false;

    // Local items (non-authenticated)
    if (cartItemId.startsWith('local-')) {
      setItems(prev => prev.map(item =>
        item.id === cartItemId ? { ...item, quantity } : item
      ));
      return true;
    }

    if (!isDbAuthenticated || !profile?.id) return false;

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ 
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', cartItemId)
        .eq('profile_id', profile.id);

      if (updateError) throw updateError;

      setItems(prev => prev.map(item =>
        item.id === cartItemId ? { ...item, quantity } : item
      ));
      
      return true;
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError('Помилка оновлення кількості');
      return false;
    }
  }, [isDbAuthenticated, profile?.id]);

  // Remove item from cart
  const removeItem = useCallback(async (cartItemId: string) => {
    // Local items (non-authenticated)
    if (cartItemId.startsWith('local-')) {
      setItems(prev => prev.filter(item => item.id !== cartItemId));
      return true;
    }

    if (!isDbAuthenticated || !profile?.id) return false;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId)
        .eq('profile_id', profile.id);

      if (deleteError) throw deleteError;

      setItems(prev => prev.filter(item => item.id !== cartItemId));
      return true;
    } catch (err) {
      console.error('Error removing from cart:', err);
      setError('Помилка видалення з кошика');
      return false;
    }
  }, [isDbAuthenticated, profile?.id]);

  // Clear entire cart
  const clearCart = useCallback(async () => {
    if (!isDbAuthenticated || !profile?.id) {
      setItems([]);
      return true;
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('profile_id', profile.id);

      if (deleteError) throw deleteError;

      setItems([]);
      return true;
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError('Помилка очищення кошика');
      return false;
    }
  }, [isDbAuthenticated, profile?.id]);

  // Calculate totals
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Fetch cart when authenticated with valid DB profile
  useEffect(() => {
    if (isDbAuthenticated && profile?.id) {
      fetchCart();
    }
  }, [isDbAuthenticated, profile?.id, fetchCart]);

  // Sync local cart to database when user authenticates
  useEffect(() => {
    const syncLocalCart = async () => {
      if (!isDbAuthenticated || !profile?.id) return;
      
      const localItems = items.filter(item => item.id.startsWith('local-'));
      if (localItems.length === 0) return;

      // Add local items to database
      for (const item of localItems) {
        await addItem(item.productId, item.name, item.price, item.image, item.size, item.color);
      }
    };

    syncLocalCart();
  }, [isDbAuthenticated, profile?.id]);

  return {
    items,
    isLoading,
    error,
    totalItems,
    totalPrice,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    fetchCart,
  };
}
