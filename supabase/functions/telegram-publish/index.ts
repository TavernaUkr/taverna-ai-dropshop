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
  category?: { name: string };
}

// Calculate savings for display
function calculateSavings(originalPrice: number | undefined, newPrice: number): string {
  if (!originalPrice || originalPrice <= newPrice) return "";
  const savings = originalPrice - newPrice;
  const percent = Math.round((1 - newPrice / originalPrice) * 100);
  return `🏷️ Економія: ${savings.toLocaleString()} ₴ (-${percent}%)`;
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

    // Fetch product data with category
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*, category:categories(name)")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found: ${productError?.message || "No data"}`);
    }

    console.log("Product fetched:", product.name, "Price:", product.price, "Original:", product.original_price);

    // Calculate savings text
    const savingsText = calculateSavings(product.original_price, product.price);

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
              content: `Ти - досвідчений копірайтер для тактичного e-commerce магазину Taverna Group.
Створи привабливий, продаючий опис товару для Telegram каналу.

ОБОВ'ЯЗКОВІ ПРАВИЛА:
- Пиши ТІЛЬКИ українською мовою
- Використовуй емодзі для привернення уваги (🔥💪🎯⚡✅🛡️)
- Опис має бути коротким (до 400 символів без ціни)
- Включи 2-3 ключові переваги товару
- НЕ вигадуй характеристики

ФОРМАТ (дотримуйся строго):
🔥 [Назва товару]

[2-3 речення про переваги товару]

💰 Ціна: ${product.price.toLocaleString()} ₴
${savingsText}

✅ [2-3 характеристики через | ]

👇 Тисни кнопку нижче, щоб замовити в один клік!`
            },
            {
              role: "user",
              content: `Створи опис для товару:
Назва: ${product.name}
Ціна для клієнта: ${product.price} ₴
${product.original_price ? `Оптова ціна: ${product.original_price} ₴` : ""}
Бренд: ${product.brand || "Не вказано"}
Опис: ${product.description || product.ai_description || "Немає опису"}
Категорія: ${product.category?.name || "Тактика"}
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

    // Use custom text, AI description, or fallback to formatted basic text
    const messageText = custom_text || aiDescription || `
🔥 ${product.name}

💰 Ціна: ${product.price.toLocaleString()} ₴
${savingsText}

${product.description ? product.description.slice(0, 200) + "..." : ""}

👇 Тисни кнопку нижче, щоб замовити в один клік!
    `.trim();

    // Get Mini App URL
    const miniAppUrl = `https://taverna-ai-dropshop.lovable.app/product/${product_id}`;

    // Prepare inline keyboard with order button
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: "🛒 Замовити зараз",
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
        price: product.price,
        original_price: product.original_price,
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
