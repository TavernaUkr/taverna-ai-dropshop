import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  external_id?: string;
  group_id?: string;
  supplier_id?: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  currency: string;
  brand?: string;
  model?: string;
  vendor_code?: string;
  sizes?: string[];
  colors?: string[];
  images?: string[];
  in_stock: boolean;
  stock_quantity?: number;
  attributes?: any;
  ai_category?: string;
  ai_tags?: string[];
  source_url?: string;
  video_url?: string;
  views_count?: number;
  is_boosted?: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    parent_id?: string | null;
  } | null;
}

interface Category {
  id: string;
  external_id?: string;
  name: string;
  slug: string;
  parent_id?: string;
  image_url?: string;
  product_count: number;
  is_active: boolean;
  subcategories?: Category[];
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (filters?: {
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    limit?: number;
    sortBy?: 'newest' | 'trending' | 'price_asc' | 'price_desc';
  }) => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, slug, parent_id)
        `)
        .eq('in_stock', true);
      
      // Apply sorting - boosted items always first
      if (filters?.sortBy === 'trending') {
        query = query.order('is_boosted', { ascending: false })
                     .order('views_count', { ascending: false, nullsFirst: false });
      } else if (filters?.sortBy === 'price_asc') {
        query = query.order('is_boosted', { ascending: false })
                     .order('price', { ascending: true });
      } else if (filters?.sortBy === 'price_desc') {
        query = query.order('is_boosted', { ascending: false })
                     .order('price', { ascending: false });
      } else {
        // Default: newest, but boosted first
        query = query.order('is_boosted', { ascending: false })
                     .order('created_at', { ascending: false });
      }

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      if (filters?.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      
      if (filters?.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      setProducts(data || []);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
      console.error('Fetch products error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (fetchError) throw fetchError;

      // Build category tree
      const categoryMap = new Map<string, Category>();
      const rootCategories: Category[] = [];

      for (const cat of data || []) {
        categoryMap.set(cat.id, { ...cat, subcategories: [] });
      }

      for (const cat of data || []) {
        const category = categoryMap.get(cat.id)!;
        if (cat.parent_id && categoryMap.has(cat.parent_id)) {
          categoryMap.get(cat.parent_id)!.subcategories!.push(category);
        } else {
          rootCategories.push(category);
        }
      }

      setCategories(rootCategories);
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  }, []);

  const getProductById = useCallback(async (id: string): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, slug, parent_id)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Get product error:', err);
      return null;
    }
  }, []);

  const searchProducts = useCallback(async (query: string) => {
    return fetchProducts({ search: query, limit: 20 });
  }, [fetchProducts]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('Product change:', payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            setProducts(prev => [payload.new as Product, ...prev]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setProducts(prev => 
              prev.map(p => p.id === (payload.new as Product).id ? payload.new as Product : p)
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setProducts(prev => prev.filter(p => p.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  return {
    products,
    categories,
    isLoading,
    error,
    fetchProducts,
    fetchCategories,
    getProductById,
    searchProducts,
  };
}