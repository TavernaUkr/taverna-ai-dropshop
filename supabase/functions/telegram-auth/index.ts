import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Telegram Mini App auth validation
async function validateTelegramAuth(initData: string, botToken: string): Promise<any> {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  // Sort parameters
  const params = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Create HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const secretKeyData = await crypto.subtle.sign(
    'HMAC',
    secretKey,
    encoder.encode(botToken)
  );
  
  const dataKey = await crypto.subtle.importKey(
    'raw',
    secretKeyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    dataKey,
    encoder.encode(params)
  );
  
  const calculatedHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (calculatedHash !== hash) {
    throw new Error('Invalid Telegram auth data');
  }
  
  // Parse user data
  const userString = urlParams.get('user');
  if (!userString) {
    throw new Error('No user data in auth');
  }
  
  return JSON.parse(userString);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { init_data, action } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // For development/testing, allow mock auth
    let telegramUser: any;
    
    if (init_data === 'mock_dev_auth') {
      // Mock user for development
      telegramUser = {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
      };
    } else if (init_data) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (!botToken) {
        // If no bot token, use the data directly for demo
        try {
          const urlParams = new URLSearchParams(init_data);
          const userString = urlParams.get('user');
          if (userString) {
            telegramUser = JSON.parse(userString);
          }
        } catch {
          throw new Error('TELEGRAM_BOT_TOKEN not configured');
        }
      } else {
        telegramUser = await validateTelegramAuth(init_data, botToken);
      }
    } else {
      throw new Error('No auth data provided');
    }
    
    console.log('Telegram user:', telegramUser);
    
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', telegramUser.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Profile fetch error:', fetchError);
    }
    
    let profile = existingProfile;
    
    if (!profile) {
      // Create new profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          telegram_id: telegramUser.id,
          telegram_username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          avatar_url: telegramUser.photo_url,
          user_type: 'customer',
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Profile insert error:', insertError);
        throw insertError;
      }
      
      profile = newProfile;
    } else {
      // Update profile with latest Telegram data
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          telegram_username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          avatar_url: telegramUser.photo_url,
        })
        .eq('id', profile.id)
        .select()
        .single();
      
      if (!updateError && updatedProfile) {
        profile = updatedProfile;
      }
    }
    
    // Fetch delivery addresses
    const { data: addresses } = await supabase
      .from('delivery_addresses')
      .select('*')
      .eq('profile_id', profile.id)
      .order('is_default', { ascending: false });
    
    // Fetch cart items
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(*)
      `)
      .eq('profile_id', profile.id);
    
    return new Response(
      JSON.stringify({
        success: true,
        profile,
        addresses: addresses || [],
        cart: cartItems || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Telegram auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});