import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { product, type = "telegram" } = await req.json();

    if (!product || !product.name) {
      throw new Error("Product data with name is required");
    }

    console.log(`Generating ${type} description for:`, product.name);

    let systemPrompt = "";
    
    if (type === "telegram") {
      systemPrompt = `Ти - досвідчений копірайтер для e-commerce магазину Taverna.
Створи привабливий, продаючий опис товару для Telegram каналу.

ПРАВИЛА:
- Пиши українською мовою
- Використовуй емодзі для привернення уваги
- Опис має бути коротким (до 500 символів)
- Включи ключові характеристики товару
- Додай заклик до дії

ФОРМАТ:
🔥 [Назва товару]

[Короткий опис переваг, 2-3 речення]

💰 Ціна: [ціна] ₴
[Якщо є знижка: 🏷️ Економія: [різниця] ₴]

✅ [2-3 ключові характеристики]

👇 Замовляйте прямо зараз!`;
    } else if (type === "marketplace") {
      systemPrompt = `Ти - SEO-оптимізований копірайтер для маркетплейсів (OLX, Prom).
Створи професійний опис товару для маркетплейсу.

ПРАВИЛА:
- Пиши українською мовою
- Використовуй ключові слова для пошуку
- Опис структурований та інформативний
- Включи всі характеристики товару
- Не використовуй емодзі
- Довжина: 300-700 символів`;
    } else if (type === "social") {
      systemPrompt = `Ти - SMM-спеціаліст для соціальних мереж (Instagram, Facebook, TikTok).
Створи вірусний пост для соціальних мереж.

ПРАВИЛА:
- Пиши українською мовою
- Використовуй емодзі та хештеги
- Короткий, захоплюючий текст
- Включи заклик до дії
- Додай 5-10 релевантних хештегів`;
    } else {
      systemPrompt = `Створи якісний опис товару українською мовою.`;
    }

    const userMessage = `Створи опис для товару:
Назва: ${product.name}
Ціна: ${product.price} ₴
${product.original_price ? `Стара ціна: ${product.original_price} ₴` : ""}
${product.brand ? `Бренд: ${product.brand}` : ""}
${product.description ? `Поточний опис: ${product.description}` : ""}
${product.sizes?.length ? `Розміри: ${product.sizes.join(", ")}` : ""}
${product.colors?.length ? `Кольори: ${product.colors.join(", ")}` : ""}
${product.vendor_code ? `Артикул: ${product.vendor_code}` : ""}
${product.model ? `Модель: ${product.model}` : ""}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices?.[0]?.message?.content || "";

    console.log("Description generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        description: generatedText,
        type,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-description error:", error);
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
