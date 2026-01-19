import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductData {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  images?: string[];
  brand?: string;
  vendor_code?: string;
  sizes?: string[];
  colors?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { product_id, channel_id = "@taverna_ukr_group", custom_text } = await req.json();

    if (!product_id) {
      throw new Error("product_id is required");
    }

    console.log(`Publishing product ${product_id} to channel ${channel_id}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch product data
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found: ${productError?.message || "No data"}`);
    }

    console.log("Product fetched:", product.name);

    // Generate AI description using Lovable AI (Gemini)
    let aiDescription = "";
    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Ти - досвідчений копірайтер для e-commerce магазину Taverna. 
Твоя задача - створювати привабливі, продаючі описи товарів для Telegram каналу.

ПРАВИЛА:
- Пиши українською мовою
- Використовуй емодзі для привернення уваги
- Опис має бути коротким (до 500 символів)
- Включи ключові характеристики товару
- Додай заклик до дії
- Формат: 
  🔥 [Назва товару]
  
  [Короткий опис переваг]
  
  💰 Ціна: [ціна] ₴
  [Якщо є знижка: 🏷️ Стара ціна: [стара ціна] ₴]
  
  ✅ [Ключові характеристики]
  
  👇 Замовляйте прямо зараз!`
            },
            {
              role: "user",
              content: `Створи опис для товару:
Назва: ${product.name}
Ціна: ${product.price} ₴
${product.original_price ? `Стара ціна: ${product.original_price} ₴` : ""}
Бренд: ${product.brand || "Не вказано"}
Опис: ${product.description || "Немає опису"}
Розміри: ${product.sizes?.join(", ") || "Не вказано"}
Кольори: ${product.colors?.join(", ") || "Не вказано"}
Артикул: ${product.vendor_code || "Не вказано"}`
            }
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiDescription = aiData.choices?.[0]?.message?.content || "";
        console.log("AI description generated successfully");
      } else {
        console.error("AI generation failed:", await aiResponse.text());
      }
    } catch (aiError) {
      console.error("AI generation error:", aiError);
    }

    // Use custom text, AI description, or fallback to basic text
    const messageText = custom_text || aiDescription || `
🔥 ${product.name}

💰 Ціна: ${product.price.toLocaleString()} ₴
${product.original_price ? `🏷️ Стара ціна: ${product.original_price.toLocaleString()} ₴` : ""}

${product.description ? product.description.slice(0, 200) + "..." : ""}

👇 Замовляйте прямо зараз!
    `.trim();

    // Get Mini App URL
    const miniAppUrl = Deno.env.get("VITE_SUPABASE_URL") 
      ? `https://taverna-ai-dropshop.lovable.app/product/${product_id}`
      : `https://taverna-ai-dropshop.lovable.app/product/${product_id}`;

    // Prepare inline keyboard with order button
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: "🛒 Замовити",
            url: miniAppUrl,
          },
        ],
        [
          {
            text: "📱 Відкрити в додатку",
            url: `https://t.me/TavernaShopBot/app?startapp=product_${product_id}`,
          },
        ],
      ],
    };

    // Send photo with caption if image exists
    const imageUrl = product.images?.[0];
    let telegramResponse;

    if (imageUrl) {
      // Send photo with caption
      telegramResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channel_id,
            photo: imageUrl,
            caption: messageText.slice(0, 1024), // Telegram caption limit
            parse_mode: "HTML",
            reply_markup: inlineKeyboard,
          }),
        }
      );
    } else {
      // Send text message
      telegramResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channel_id,
            text: messageText,
            parse_mode: "HTML",
            reply_markup: inlineKeyboard,
          }),
        }
      );
    }

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error("Telegram API error:", telegramResult);
      throw new Error(`Telegram API error: ${telegramResult.description}`);
    }

    console.log("Message sent successfully:", telegramResult.result.message_id);

    // Update promotion record with telegram message id
    const { error: updateError } = await supabase
      .from("promotions")
      .update({
        telegram_message_id: telegramResult.result.message_id,
        telegram_channel_id: channel_id,
        ai_generated_text: aiDescription || null,
        status: "active",
        start_date: new Date().toISOString(),
      })
      .eq("product_id", product_id)
      .eq("status", "pending");

    if (updateError) {
      console.warn("Failed to update promotion:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: telegramResult.result.message_id,
        ai_description: aiDescription,
        channel: channel_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("telegram-publish error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
