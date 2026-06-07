import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: any, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { session_token, mode = "seed" } = body;

    // admin only
    if (!session_token) return json({ error: "session_token required" }, 401);
    const { data: session } = await supabase
      .from("sessions").select("*, profile:profiles(*)")
      .eq("token_hash", await hashToken(session_token)).gt("expires_at", new Date().toISOString()).single();
    if (!session) return json({ error: "Invalid session" }, 401);
    const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", session.profile.id);
    const roles = (rolesData || []).map((r: any) => r.role);
    if (!roles.includes("admin")) return json({ error: "Forbidden: admin required" }, 403);

    if (mode === "clear") {
      await supabase.from("balance_movements").delete().like("description", "%[TEST]%");
      await supabase.from("order_splits").delete().eq("split_status", "test");
      await supabase.from("orders").delete().like("order_number", "TEST-%");
      return json({ success: true, cleared: true });
    }

    const { data: suppliers } = await supabase.from("suppliers").select("id, shop_name").eq("is_active", true).limit(8);
    if (!suppliers?.length) return json({ error: "Немає магазинів для генерації" }, 400);

    const created: any[] = [];
    const now = Date.now();

    for (let i = 0; i < suppliers.length; i++) {
      const sup = suppliers[i];
      const isCod = i % 2 === 1; // alternate prepaid / COD
      const retail = 1000 + i * 250;
      const supplierAmount = Math.round((retail / 1.33) * 100) / 100;
      const commission = Math.round((retail - supplierAmount) * 100) / 100;

      // create order
      const { data: order } = await supabase.from("orders").insert({
        order_number: `TEST-${now}-${i}`,
        status: "delivered",
        subtotal: retail,
        total: retail,
        payment_method: isCod ? "cash_on_delivery" : "card",
        payment_status: isCod ? "pending" : "paid",
        received_at: new Date(now - 20 * 24 * 3600 * 1000).toISOString(), // received 20 days ago → eligible
        tracking_status: "received",
        notes: "[TEST] generated for payment testing",
      }).select().single();
      if (!order) continue;

      // create split, already eligible (eligible 5 days ago)
      const { data: split } = await supabase.from("order_splits").insert({
        order_id: order.id,
        supplier_id: sup.id,
        product_total: retail,
        supplier_amount: supplierAmount,
        platform_commission: commission,
        markup_percentage: 33,
        payment_method: isCod ? "cash_on_delivery" : "card",
        split_status: "test",
        payout_stage: "created",
        payout_type: isCod ? "partial_markup" : "full_prepaid",
        eligible_payout_at: new Date(now - 5 * 24 * 3600 * 1000).toISOString(),
        is_returnable: true,
      }).select().single();

      created.push({ shop: sup.shop_name, order: order.order_number, type: isCod ? "COD" : "prepaid", supplier_amount: supplierAmount, commission });
    }

    // run accruals immediately so balances populate
    const accrualRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/bank-gateway`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! },
      body: JSON.stringify({ action: "run_accruals" }),
    });
    const accrual = await accrualRes.json();

    return json({ success: true, created, accrual });
  } catch (err: any) {
    console.error("seed-test-payments error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
