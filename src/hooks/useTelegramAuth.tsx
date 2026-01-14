import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface Profile {
  id: string;
  telegram_id: number | null;
  telegram_username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  user_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DeliveryAddress {
  id: string;
  profile_id: string | null;
  is_default: boolean;
  recipient_name: string;
  phone: string;
  delivery_service: string;
  city: string;
  city_ref?: string | null;
  delivery_type: string;
  warehouse_number?: string | null;
  warehouse_ref?: string | null;
  street_address?: string | null;
  building_number?: string | null;
  apartment?: string | null;
  postal_code?: string | null;
  notes?: string | null;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  profile: Profile | null;
  addresses: DeliveryAddress[];
  error: string | null;
}

export function useTelegramAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    profile: null,
    addresses: [],
    error: null,
  });

  const authenticate = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check if running in Telegram Mini App
      const tg = (window as any).Telegram?.WebApp;
      let initData = tg?.initData;
      
      // For development, use mock auth
      if (!initData || initData === '') {
        console.log('No Telegram initData, using mock auth for development');
        initData = 'mock_dev_auth';
      }
      
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { init_data: initData },
      });
      
      if (error) throw error;
      
      if (data?.success && data?.profile) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          profile: data.profile,
          addresses: data.addresses || [],
          error: null,
        });
        return data.profile;
      } else {
        throw new Error(data?.error || 'Authentication failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      console.error('Auth error:', errorMessage);
      setState({
        isLoading: false,
        isAuthenticated: false,
        profile: null,
        addresses: [],
        error: errorMessage,
      });
      return null;
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!state.profile) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', state.profile.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setState(prev => ({ ...prev, profile: data }));
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      return null;
    }
  }, [state.profile]);

  const addAddress = useCallback(async (address: Omit<DeliveryAddress, 'id' | 'profile_id'>) => {
    if (!state.profile) return null;
    
    try {
      const { data, error } = await supabase
        .from('delivery_addresses')
        .insert({
          ...address,
          profile_id: state.profile.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setState(prev => ({ 
        ...prev, 
        addresses: [...prev.addresses, data] 
      }));
      return data;
    } catch (error) {
      console.error('Add address error:', error);
      return null;
    }
  }, [state.profile]);

  const updateAddress = useCallback(async (id: string, updates: Partial<DeliveryAddress>) => {
    try {
      const { data, error } = await supabase
        .from('delivery_addresses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      setState(prev => ({
        ...prev,
        addresses: prev.addresses.map(a => a.id === id ? data : a),
      }));
      return data;
    } catch (error) {
      console.error('Update address error:', error);
      return null;
    }
  }, []);

  const deleteAddress = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('delivery_addresses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setState(prev => ({
        ...prev,
        addresses: prev.addresses.filter(a => a.id !== id),
      }));
      return true;
    } catch (error) {
      console.error('Delete address error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setState({
      isLoading: false,
      isAuthenticated: false,
      profile: null,
      addresses: [],
      error: null,
    });
  }, []);

  // Auto-authenticate on mount if in Telegram
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData) {
      authenticate();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [authenticate]);

  return {
    ...state,
    authenticate,
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    logout,
  };
}