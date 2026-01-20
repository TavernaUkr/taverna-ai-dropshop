import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hash the token for lookup
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
}

// Validate session
async function validateSession(supabase: any, sessionToken: string): Promise<any> {
  if (!sessionToken) return null;
  
  const tokenHash = await hashToken(sessionToken);
  
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*, profile:profiles(*)')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error || !session) {
    return null;
  }
  
  return session;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, session_token, context, image_base64 } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    
    // Optional: validate session for personalized responses
    let profile = null;
    if (session_token) {
      const session = await validateSession(supabase, session_token);
      if (session) {
        profile = session.profile;
      }
    }
    
    // Fetch some products for context
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, sizes, colors, in_stock')
      .eq('in_stock', true)
      .limit(50);
    
    // Fetch user's orders if authenticated
    let userOrders = null;
    if (profile) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, status, total, created_at')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      userOrders = orders;
    }
    
    const userName = profile?.first_name || 'шановний клієнте';
    
    // Build context for AI
    const productContext = products?.slice(0, 20).map(p => 
      `- ${p.name}: ${p.price}₴, розміри: ${p.sizes?.join(', ') || 'н/д'}, кольори: ${p.colors?.join(', ') || 'н/д'}`
    ).join('\n') || '';
    
    const ordersContext = userOrders?.map(o => 
      `- Замовлення ${o.order_number}: статус "${o.status}", сума ${o.total}₴, дата ${new Date(o.created_at).toLocaleDateString('uk-UA')}`
    ).join('\n') || '';
    
    const systemPrompt = `Ти — AI-асистент маркетплейсу Taverna, спеціалізованого на тактичному та військовому спорядженні.
    
Правила:
1. Відповідай ТІЛЬКИ українською мовою
2. Будь дружнім та професійним
3. Використовуй емодзі помірковано
4. Якщо користувач питає про товар — шукай у наявному каталозі
5. Якщо питає про замовлення — перевір статус в історії
6. Для підбору розміру — проси виміри (груди, талія, стопа)
7. Для повернення — поясни процедуру та запитай фото товару
8. НЕ вигадуй інформацію, якої не маєш

Користувач: ${userName}
${userOrders?.length ? `\nЙого замовлення:\n${ordersContext}` : ''}

Доступні товари (приклад):\n${productContext}

Процедура повернення:
1. Товар можна повернути протягом 14 днів
2. Товар має бути в оригінальній упаковці
3. Надішліть фото товару для перевірки
4. Ми створимо ТТН на повернення через Нову Пошту

ВАЖЛИВО: Відповідай коротко (до 3-4 речень), якщо не потрібно більше деталей.`;

    // Prepare messages for AI
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];
    
    // Add conversation context if provided
    if (context && Array.isArray(context)) {
      for (const msg of context.slice(-6)) { // Last 6 messages for context
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }
    
    // Add current message with optional image
    if (image_base64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Проаналізуй це зображення' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image_base64}` } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: message });
    }
    
    console.log(`AI Assistant request from ${profile?.id || 'guest'}: ${message?.substring(0, 50)}...`);
    
    // Call Lovable AI Gateway (Gemini)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: image_base64 ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }
    
    const aiResult = await response.json();
    const assistantMessage = aiResult.choices?.[0]?.message?.content || 'Вибачте, виникла помилка. Спробуйте ще раз.';
    
    // Log for analytics
    console.log(`AI response generated successfully`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: assistantMessage,
        model: image_base64 ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('AI Assistant error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        message: 'Вибачте, AI-асистент тимчасово недоступний. Спробуйте пізніше або зверніться до підтримки.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
