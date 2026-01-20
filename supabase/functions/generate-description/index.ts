import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculate savings percentage
function calculateSavings(originalPrice: number, newPrice: number): { amount: number; percent: number } | null {
  if (!originalPrice || originalPrice <= newPrice) return null;
  return {
    amount: originalPrice - newPrice,
    percent: Math.round((1 - newPrice / originalPrice) * 100)
  };
}

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

    // Calculate savings for display
    const savings = calculateSavings(product.original_price, product.price);
    const savingsText = savings 
      ? `\n🏷️ Економія: ${savings.amount.toLocaleString()} ₴ (-${savings.percent}%)`
      : "";

    let systemPrompt = "";
    
    if (type === "telegram") {
      systemPrompt = `Ти - досвідчений копірайтер для тактичного e-commerce магазину Taverna Group.
Створи привабливий, продаючий опис товару для Telegram каналу.

ОБОВ'ЯЗКОВІ ПРАВИЛА:
- Пиши ТІЛЬКИ українською мовою
- Використовуй емодзі для привернення уваги (🔥💪🎯⚡✅🛡️)
- Опис має бути коротким (до 400 символів без ціни)
- Включи 2-3 ключові переваги товару
- НЕ вигадуй характеристики, яких немає в даних
- ОБОВ'ЯЗКОВО включи ціну та заклик до дії в кінці

ФОРМАТ (дотримуйся строго):
🔥 [Назва товару]

[2-3 речення про переваги товару - чому це крутий вибір]

💰 Ціна: ${product.price?.toLocaleString() || '???'} ₴${savingsText}

✅ [2-3 ключові характеристики через | ]

👇 Тисни кнопку нижче, щоб замовити в один клік!`;
    } else if (type === "marketplace") {
      systemPrompt = `Ти - SEO-оптимізований копірайтер для маркетплейсів (OLX, Prom).
Створи професійний опис товару для маркетплейсу.

ПРАВИЛА:
- Пиши українською мовою
- Використовуй ключові слова для пошуку
- Опис структурований та інформативний
- Включи всі характеристики товару
- НЕ використовуй емодзі
- Довжина: 400-800 символів
- Включи ціну: ${product.price?.toLocaleString() || '???'} ₴`;
    } else if (type === "social") {
      systemPrompt = `Ти - SMM-спеціаліст для соціальних мереж (Instagram, Facebook, TikTok).
Створи вірусний пост для соціальних мереж.

ПРАВИЛА:
- Пиши українською мовою
- Використовуй емодзі та хештеги
- Короткий, захоплюючий текст (до 280 символів)
- Включи заклик до дії
- Ціна: ${product.price?.toLocaleString() || '???'} ₴
- Додай 5-8 релевантних хештегів (#тактика #мілітарі #україна тощо)`;
    } else if (type === "catalog") {
      systemPrompt = `Ти - копірайтер для каталогу інтернет-магазину.
Створи короткий, інформативний опис товару.

ПРАВИЛА:
- Пиши українською мовою
- Короткий опис (до 200 символів)
- Включи тільки найважливіші характеристики
- Ніяких емодзі та CTA`;
    } else {
      systemPrompt = `Створи якісний опис товару українською мовою. Ціна: ${product.price?.toLocaleString() || '???'} ₴`;
    }

    const userMessage = `Створи опис для товару:
Назва: ${product.name}
Ціна для клієнта: ${product.price} ₴
${product.original_price ? `Оптова ціна (стара): ${product.original_price} ₴` : ""}
${product.brand ? `Бренд: ${product.brand}` : ""}
${product.description ? `Існуючий опис: ${product.description}` : ""}
${product.sizes?.length ? `Розміри: ${product.sizes.join(", ")}` : ""}
${product.colors?.length ? `Кольори: ${product.colors.join(", ")}` : ""}
${product.vendor_code ? `Артикул: ${product.vendor_code}` : ""}
${product.model ? `Модель: ${product.model}` : ""}
${product.category ? `Категорія: ${product.category}` : ""}`;

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

    console.log("Description generated successfully for type:", type);

    return new Response(
      JSON.stringify({
        success: true,
        description: generatedText,
        type,
        price: product.price,
        original_price: product.original_price,
        savings: savings,
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
