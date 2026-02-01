import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Posting intervals (in minutes)
const INTERVALS = {
  newProducts: { min: 2, max: 5 },
  oldProducts: { min: 10, max: 25 },
};

function getRandomInterval(type: "new" | "old"): number {
  const interval = type === "new" ? INTERVALS.newProducts : INTERVALS.oldProducts;
  return Math.floor(Math.random() * (interval.max - interval.min + 1)) + interval.min;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Starting auto-post cycle...");

    // Get the next supplier in the queue (round-robin)
    const { data: queue, error: queueError } = await supabase
      .from("auto_promotion_queue")
      .select("*, supplier:suppliers(id, shop_name, is_active)")
      .order("last_promoted_at", { ascending: true, nullsFirst: true })
      .limit(1)
      .single();

    if (queueError || !queue) {
      console.log("No suppliers in auto-promotion queue");
      return new Response(
        JSON.stringify({ success: false, message: "No suppliers in queue" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supplierId = queue.supplier_id;
    console.log(`Processing supplier: ${queue.supplier?.shop_name || supplierId}`);

    // Get products from this supplier that haven't been promoted recently
    const { data: recentPromotions } = await supabase
      .from("promotions")
      .select("product_id")
      .eq("supplier_id", supplierId)
      .eq("promotion_type", "auto")
      .gte("start_date", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const recentProductIds = recentPromotions?.map((p) => p.product_id) || [];

    // Get a random product not recently promoted
    let productQuery = supabase
      .from("products")
      .select("*, category:categories(name)")
      .eq("supplier_id", supplierId)
      .eq("in_stock", true);

    if (recentProductIds.length > 0) {
      productQuery = productQuery.not("id", "in", `(${recentProductIds.join(",")})`);
    }

    const { data: products, error: productsError } = await productQuery.limit(20);

    if (productsError || !products || products.length === 0) {
      console.log("No available products for this supplier");
      
      // Move to next supplier
      await supabase
        .from("auto_promotion_queue")
        .update({ last_promoted_at: new Date().toISOString() })
        .eq("id", queue.id);

      return new Response(
        JSON.stringify({ success: false, message: "No products available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Randomly select a product (AI Gemini style randomization)
    const randomIndex = Math.floor(Math.random() * products.length);
    const selectedProduct = products[randomIndex];

    console.log(`Selected product: ${selectedProduct.name}`);

    // Generate AI description
    let aiDescription = "";
    const retailPrice = selectedProduct.price;
    const marketingOldPrice = Math.ceil(retailPrice * 1.18 / 10) * 10;
    const discount = Math.round((1 - retailPrice / marketingOldPrice) * 100);
    const savings = marketingOldPrice - retailPrice;

    if (LOVABLE_API_KEY) {
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
                content: `Ти - копірайтер для тактичного магазину Taverna Group.
Створи привабливий опис товару для Telegram (до 400 символів).

ПРАВИЛА:
- Пиши українською
- Використовуй емодзі (🔥💪🎯⚡✅🛡️)
- НЕ вигадуй характеристики
- НІКОЛИ не згадуй оптові ціни

ФОРМАТ:
🔥 [Назва]

[2-3 речення про переваги]

💰 Ціна: ${retailPrice.toLocaleString()} ₴
🏷️ Звичайна: ${marketingOldPrice.toLocaleString()} ₴
✨ Економія: ${savings.toLocaleString()} ₴ (-${discount}%)

✅ [Характеристики]

👇 Замовляй!`
              },
              {
                role: "user",
                content: `Товар: ${selectedProduct.name}
Ціна: ${retailPrice} ₴
Бренд: ${selectedProduct.brand || "Не вказано"}
Опис: ${selectedProduct.description || selectedProduct.ai_description || ""}
Категорія: ${selectedProduct.category?.name || "Тактика"}`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiDescription = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (aiError) {
        console.error("AI error:", aiError);
      }
    }

    // Fallback text
    const messageText = aiDescription || `
🔥 ${selectedProduct.name}

💰 Ціна: ${retailPrice.toLocaleString()} ₴
🏷️ Звичайна: ${marketingOldPrice.toLocaleString()} ₴
✨ Економія: ${savings.toLocaleString()} ₴

${selectedProduct.description ? selectedProduct.description.slice(0, 150) + "..." : ""}

👇 Замовляй у Taverna Drop Shop!
    `.trim();

    // Publish to Telegram
    const channelId = "@taverna_ukr_group";
    const miniAppUrl = `https://taverna-ai-dropshop.lovable.app/product/${selectedProduct.id}`;

    const inlineKeyboard = {
      inline_keyboard: [
        [{ text: "🛒 Замовити зараз", url: miniAppUrl }],
        [{ text: "📱 Відкрити в додатку", url: `https://t.me/TavernaShopBot/app?startapp=product_${selectedProduct.id}` }],
      ],
    };

    const imageUrl = selectedProduct.images?.[0];
    let telegramResponse;

    if (imageUrl) {
      telegramResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channelId,
            photo: imageUrl,
            caption: messageText.slice(0, 1024),
            parse_mode: "HTML",
            reply_markup: inlineKeyboard,
          }),
        }
      );
    } else {
      telegramResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channelId,
            text: messageText,
            parse_mode: "HTML",
            reply_markup: inlineKeyboard,
          }),
        }
      );
    }

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      throw new Error(`Telegram error: ${telegramResult.description}`);
    }

    console.log("Posted to Telegram:", telegramResult.result.message_id);

    // Create promotion record
    await supabase.from("promotions").insert({
      supplier_id: supplierId,
      product_id: selectedProduct.id,
      promotion_type: "auto",
      status: "active",
      platforms: ["telegram"],
      telegram_message_id: telegramResult.result.message_id,
      telegram_channel_id: channelId,
      ai_generated_text: aiDescription || null,
      start_date: new Date().toISOString(),
    });

    // Update queue position
    await supabase
      .from("auto_promotion_queue")
      .update({
        last_promoted_at: new Date().toISOString(),
        total_promotions: (queue.total_promotions || 0) + 1,
      })
      .eq("id", queue.id);

    // Calculate next interval
    const isNewProduct = new Date(selectedProduct.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    const nextInterval = getRandomInterval(isNewProduct ? "new" : "old");

    return new Response(
      JSON.stringify({
        success: true,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        supplier_id: supplierId,
        message_id: telegramResult.result.message_id,
        next_post_in_minutes: nextInterval,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("auto-post error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
