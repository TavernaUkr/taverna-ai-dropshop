import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Heuristic fallback keywords for non-returnable goods under Ukrainian law
// (hygiene, underwear, perishable food, cosmetics opened, etc.)
const NON_RETURNABLE_KEYWORDS = [
  "білизн", "трус", "бюстгальтер", "купальник", "шкарпет", "колгот",
  "їжа", "продукт", "харч", "напій", "косметик", "парфум", "крем",
  "гігієн", "зубн", "памперс", "підгузк", "ліки", "медичн", "маск",
  "сереж", "пірсинг", "контактн лінз",
];

function heuristicReturnable(name: string, category: string): boolean {
  const text = `${name} ${category}`.toLowerCase();
  return !NON_RETURNABLE_KEYWORDS.some((k) => text.includes(k));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    const body = await req.json().catch(() => ({}));
    const productId: string | undefined = body?.product_id;
    const limit: number = body?.limit || 50;

    let query = supabase
      .from("products")
      .select("id, name, ai_category, returnability_source, category:categories(name)");
    if (productId) {
      query = query.eq("id", productId);
    } else {
      // only classify products not yet classified by AI/manual
      query = query.eq("returnability_source", "default").limit(limit);
    }

    const { data: products, error } = await query;
    if (error) throw error;

    let classified = 0;

    for (const p of products || []) {
      const categoryName = (p as any).category?.name || p.ai_category || "";
      let isReturnable = heuristicReturnable(p.name || "", categoryName);
      let source = "ai";

      // Try Lovable AI for nuanced classification
      if (lovableKey) {
        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${lovableKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: "Ти класифікуєш товари за законом України про захист прав споживачів. Визнач, чи підлягає товар обміну/поверненню протягом 14 днів. Незворотні: білизна, панчішно-шкарпеткові вироби, їжа, ліки, косметика/парфуми, засоби гігієни, ювелірні вироби. Відповідай лише JSON: {\"returnable\": true|false}.",
                },
                { role: "user", content: `Товар: "${p.name}". Категорія: "${categoryName}".` },
              ],
            }),
          });
          if (aiResp.ok) {
            const j = await aiResp.json();
            const content = j?.choices?.[0]?.message?.content || "";
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (typeof parsed.returnable === "boolean") isReturnable = parsed.returnable;
            }
          }
        } catch (e) {
          console.error("AI classify error:", e);
        }
      }

      await supabase.from("products").update({
        is_returnable: isReturnable,
        return_window_days: isReturnable ? 14 : 0,
        returnability_source: source,
      }).eq("id", p.id);
      classified++;
    }

    return new Response(JSON.stringify({ success: true, classified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-returnability error:", err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : "error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
