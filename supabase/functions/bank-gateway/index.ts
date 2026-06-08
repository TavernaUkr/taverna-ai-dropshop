import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
};

// ---- provider availability (sandbox if secrets are missing) ----
const MONOBANK_TOKEN = Deno.env.get("MONOBANK_TOKEN") || "";
const LIQPAY_PUBLIC = Deno.env.get("LIQPAY_PUBLIC_KEY") || "";
const LIQPAY_PRIVATE = Deno.env.get("LIQPAY_PRIVATE_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function providerMode(provider: string): "live" | "sandbox" {
  if (provider === "monobank") return MONOBANK_TOKEN ? "live" : "sandbox";
  if (provider === "liqpay") return LIQPAY_PUBLIC && LIQPAY_PRIVATE ? "live" : "sandbox";
  return "sandbox";
}

function fakeTx(prefix: string): string {
  return `${prefix}-SBX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- session / role helpers ----
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}
async function validateSession(supabase: any, sessionToken: string) {
  const tokenHash = await hashToken(sessionToken);
  const { data } = await supabase
    .from("sessions")
    .select("*, profile:profiles(*)")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .single();
  return data || null;
}
async function getRoles(supabase: any, profileId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", profileId);
  return (data || []).map((r: any) => r.role);
}
async function canManageSupplier(
  supabase: any,
  profileId: string,
  supplierId: string,
  telegramId: number | null,
): Promise<boolean> {
  // Suppliers are linked to their owner via telegram_id (no profile_id column).
  if (telegramId != null) {
    const { data: sup } = await supabase
      .from("suppliers").select("telegram_id").eq("id", supplierId).maybeSingle();
    if (sup && Number(sup.telegram_id) === Number(telegramId)) return true;
  }
  // Managers are linked via shop_manager_links.
  const { data: link } = await supabase
    .from("shop_manager_links").select("id")
    .eq("supplier_id", supplierId).eq("profile_id", profileId).maybeSingle();
  return !!link;
}

// Returns all supplier (shop) ids the caller owns (by telegram_id) or manages.
async function getCallerShopIds(
  supabase: any,
  profileId: string | null,
  telegramId: number | null,
): Promise<string[]> {
  const ids = new Set<string>();
  if (telegramId != null) {
    const { data } = await supabase.from("suppliers").select("id").eq("telegram_id", telegramId);
    (data || []).forEach((s: any) => ids.add(s.id));
  }
  if (profileId) {
    const { data } = await supabase.from("shop_manager_links").select("supplier_id").eq("profile_id", profileId);
    (data || []).forEach((l: any) => ids.add(l.supplier_id));
  }
  return [...ids];
}

// ---- stats helpers (earnings breakdown by period + products sold) ----
type StatPeriod = "day" | "week" | "month" | "year";
const pad2 = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const yearKey = (d: Date) => `${d.getFullYear()}`;
function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((((t.getTime() - firstThu.getTime()) / 86400000) - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${pad2(week)}`;
}
function keyForPeriod(period: StatPeriod, dateStr: string): string {
  const d = new Date(dateStr);
  return period === "day" ? dayKey(d) : period === "week" ? weekKey(d) : period === "month" ? monthKey(d) : yearKey(d);
}
function makeBuckets(period: StatPeriod): { key: string; label: string }[] {
  const now = new Date();
  const arr: { key: string; label: string }[] = [];
  if (period === "day") {
    for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); arr.push({ key: dayKey(d), label: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}` }); }
  } else if (period === "week") {
    for (let i = 11; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i * 7); const k = weekKey(d); arr.push({ key: k, label: `${k.split("-W")[1]} тиж` }); }
  } else if (period === "month") {
    const names = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"];
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); arr.push({ key: monthKey(d), label: `${names[d.getMonth()]} ${d.getFullYear()}` }); }
  } else {
    for (let i = 4; i >= 0; i--) { const y = now.getFullYear() - i; arr.push({ key: String(y), label: String(y) }); }
  }
  return arr;
}
function buildStats(splits: any[], items: any[]) {
  const periods: StatPeriod[] = ["day", "week", "month", "year"];
  const series: Record<string, any[]> = {};
  for (const period of periods) {
    const buckets = makeBuckets(period);
    const map: Record<string, any> = {};
    buckets.forEach((b) => { map[b.key] = { label: b.label, turnover: 0, earned: 0, productsSold: 0, amount: 0 }; });
    for (const s of splits) {
      const k = keyForPeriod(period, s.created_at);
      if (map[k]) { map[k].turnover += Number(s.product_total || 0); map[k].earned += Number(s.supplier_amount || 0); }
    }
    for (const it of items) {
      const k = keyForPeriod(period, it.created_at);
      if (map[k]) { map[k].productsSold += Number(it.quantity || 0); map[k].amount += Number(it.total || 0); }
    }
    series[period] = buckets.map((b) => ({ ...map[b.key] }));
  }
  return series;
}

// ---- ledger core ----
async function applyMovement(
  supabase: any,
  supplierId: string,
  m: { type: string; amount: number; status?: string; provider?: string; external_tx_id?: string; description?: string; order_split_id?: string | null },
) {
  // ensure balance row exists
  let { data: bal } = await supabase.from("shop_balances").select("*").eq("supplier_id", supplierId).maybeSingle();
  if (!bal) {
    const { data: created } = await supabase.from("shop_balances")
      .insert({ supplier_id: supplierId }).select().single();
    bal = created;
  }
  const status = m.status || "settled";
  let available = Number(bal.available);
  let lifetimePaid = Number(bal.lifetime_paid);
  if (status === "settled") {
    available += m.amount;
    if (m.type === "withdrawal") lifetimePaid += Math.abs(m.amount);
  }
  await supabase.from("shop_balances").update({
    available: Math.round(available * 100) / 100,
    lifetime_paid: Math.round(lifetimePaid * 100) / 100,
  }).eq("supplier_id", supplierId);

  const { data: mv } = await supabase.from("balance_movements").insert({
    supplier_id: supplierId,
    order_split_id: m.order_split_id || null,
    type: m.type,
    amount: m.amount,
    balance_after: Math.round(available * 100) / 100,
    status,
    provider: m.provider || "internal",
    external_tx_id: m.external_tx_id || null,
    description: m.description || null,
  }).select().single();
  return { balance_after: available, movement: mv };
}

// ---- provider: outgoing payout to supplier ----
async function providerPayout(provider: string, amount: number, dest: { iban?: string; card_token?: string; holder?: string }) {
  const mode = providerMode(provider);
  if (mode === "sandbox") {
    return { ok: true, tx_id: fakeTx(provider.toUpperCase() + "-PAYOUT"), mode };
  }
  // LIVE: real outgoing transfer (FOP business / payout API)
  try {
    if (provider === "liqpay" && dest.card_token) {
      // LiqPay p2pcredit to a tokenized card
      const payload = btoa(JSON.stringify({
        public_key: LIQPAY_PUBLIC, version: 3, action: "p2pcredit",
        amount, currency: "UAH", card_token: dest.card_token,
        description: "Taverna payout", order_id: fakeTx("ord"),
      }));
      const sig = await liqpaySignature(payload);
      const res = await fetch("https://www.liqpay.ua/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(payload)}&signature=${encodeURIComponent(sig)}`,
      });
      const json = await res.json();
      return { ok: json.status === "success" || json.result === "ok", tx_id: json.transaction_id || json.payment_id || fakeTx("LP"), mode, raw: json };
    }
    // monobank business payouts require statement/payment API — placeholder live path
    return { ok: true, tx_id: fakeTx("MONO-PAYOUT"), mode: "sandbox" as const };
  } catch (e: any) {
    return { ok: false, error: e.message, mode };
  }
}

// ---- provider: charge our markup from supplier's bound card (COD) ----
async function providerCharge(provider: string, amount: number, cardToken: string) {
  const mode = providerMode(provider);
  if (mode === "sandbox" || !cardToken) {
    return { ok: true, tx_id: fakeTx(provider.toUpperCase() + "-CHARGE"), mode };
  }
  try {
    const payload = btoa(JSON.stringify({
      public_key: LIQPAY_PUBLIC, version: 3, action: "paytoken",
      amount, currency: "UAH", card_token: cardToken,
      description: "Taverna markup", order_id: fakeTx("chg"),
    }));
    const sig = await liqpaySignature(payload);
    const res = await fetch("https://www.liqpay.ua/api/request", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(payload)}&signature=${encodeURIComponent(sig)}`,
    });
    const json = await res.json();
    return { ok: json.status === "success", tx_id: json.transaction_id || fakeTx("LP"), mode, raw: json };
  } catch (e: any) {
    return { ok: false, error: e.message, mode };
  }
}

async function liqpaySignature(data: string): Promise<string> {
  const str = LIQPAY_PRIVATE + data + LIQPAY_PRIVATE;
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: any, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);
    const body = await req.json();
    const { action } = body;

    // internal calls (cron / other functions) authenticate with the service key
    const internalKey = req.headers.get("x-internal-key");
    const isInternal = internalKey === SERVICE_KEY;

    // resolve caller for user actions
    let profileId: string | null = null;
    let telegramId: number | null = null;
    let roles: string[] = [];
    if (!isInternal) {
      if (!body.session_token) return json({ error: "session_token required" }, 401);
      const session = await validateSession(supabase, body.session_token);
      if (!session) return json({ error: "Invalid session" }, 401);
      profileId = session.profile.id;
      telegramId = session.profile.telegram_id ?? null;
      roles = await getRoles(supabase, profileId);
    }
    const isAdmin = roles.includes("admin");
    const isModerator = roles.includes("moderator");
    const isStaff = isAdmin || isModerator;

    // ---------------- get_balance ----------------
    if (action === "get_balance") {
      const { supplier_id } = body;
      if (!supplier_id) return json({ error: "supplier_id required" }, 400);
      if (!isStaff && !(profileId && await canManageSupplier(supabase, profileId, supplier_id, telegramId)))
        return json({ error: "Forbidden" }, 403);

      let { data: bal } = await supabase.from("shop_balances").select("*").eq("supplier_id", supplier_id).maybeSingle();
      if (!bal) {
        const { data: created } = await supabase.from("shop_balances").insert({ supplier_id }).select().single();
        bal = created;
      }
      const { data: method } = await supabase.from("payout_methods")
        .select("id, provider, type, masked_pan, holder, iban, is_default, auto_withdraw, auto_charge, min_withdraw")
        .eq("supplier_id", supplier_id).eq("is_default", true).maybeSingle();
      return json({ balance: bal, method: method || null, providers: { monobank: providerMode("monobank"), liqpay: providerMode("liqpay") } });
    }

    // ---------------- list_balances (staff: all shops) ----------------
    if (action === "list_balances") {
      if (!isStaff) return json({ error: "Forbidden" }, 403);
      const { data: suppliers } = await supabase.from("suppliers")
        .select("id, shop_name, is_active").order("shop_name");
      const { data: balances } = await supabase.from("shop_balances").select("*");
      const { data: methods } = await supabase.from("payout_methods").select("*").eq("is_default", true);
      const balMap: Record<string, any> = {};
      (balances || []).forEach((b: any) => { balMap[b.supplier_id] = b; });
      const methodMap: Record<string, any> = {};
      (methods || []).forEach((m: any) => { methodMap[m.supplier_id] = m; });
      const rows = (suppliers || []).map((s: any) => ({
        supplier_id: s.id,
        shop_name: s.shop_name,
        is_active: s.is_active,
        available: Number(balMap[s.id]?.available || 0),
        lifetime_paid: Number(balMap[s.id]?.lifetime_paid || 0),
        currency: balMap[s.id]?.currency || "UAH",
        method: methodMap[s.id]
          ? {
              type: methodMap[s.id].type, provider: methodMap[s.id].provider,
              masked_pan: methodMap[s.id].masked_pan, iban: isAdmin ? methodMap[s.id].iban : null,
              auto_withdraw: methodMap[s.id].auto_withdraw, auto_charge: methodMap[s.id].auto_charge,
              min_withdraw: methodMap[s.id].min_withdraw,
            }
          : null,
      }));
      return json({ rows, role: isAdmin ? "admin" : "moderator", providers: { monobank: providerMode("monobank"), liqpay: providerMode("liqpay") } });
    }

    // ---------------- list_movements ----------------
    if (action === "list_movements") {
      const { supplier_id } = body;
      if (!supplier_id) return json({ error: "supplier_id required" }, 400);
      if (!isStaff && !(profileId && await canManageSupplier(supabase, profileId, supplier_id, telegramId)))
        return json({ error: "Forbidden" }, 403);
      const { data } = await supabase.from("balance_movements")
        .select("*").eq("supplier_id", supplier_id).order("created_at", { ascending: false }).limit(200);
      return json({ movements: data || [] });
    }

    // ---------------- set_payout_method (supplier/staff) ----------------
    if (action === "set_payout_method") {
      const { supplier_id, auto_withdraw, auto_charge, min_withdraw, iban, holder } = body;
      if (!supplier_id) return json({ error: "supplier_id required" }, 400);
      if (!isStaff && !(profileId && await canManageSupplier(supabase, profileId, supplier_id, telegramId)))
        return json({ error: "Forbidden" }, 403);

      const { data: existing } = await supabase.from("payout_methods")
        .select("id").eq("supplier_id", supplier_id).eq("is_default", true).maybeSingle();
      const patch: any = {};
      if (auto_withdraw !== undefined) patch.auto_withdraw = auto_withdraw;
      if (auto_charge !== undefined) patch.auto_charge = auto_charge;
      if (min_withdraw !== undefined) patch.min_withdraw = min_withdraw;
      if (iban !== undefined) { patch.iban = iban; patch.type = "iban"; }
      if (holder !== undefined) patch.holder = holder;

      if (existing) {
        await supabase.from("payout_methods").update(patch).eq("id", existing.id);
      } else {
        await supabase.from("payout_methods").insert({ supplier_id, is_default: true, ...patch });
      }
      return json({ success: true });
    }

    // ---------------- bind_card (supplier/staff) ----------------
    // Stores only masked PAN + provider token (never raw PAN/CVV in DB).
    if (action === "bind_card") {
      const { supplier_id, card_number, holder, provider = "liqpay" } = body;
      if (!supplier_id || !card_number) return json({ error: "supplier_id and card_number required" }, 400);
      if (!isStaff && !(profileId && await canManageSupplier(supabase, profileId, supplier_id, telegramId)))
        return json({ error: "Forbidden" }, 403);

      const digits = String(card_number).replace(/\D/g, "");
      if (digits.length < 12) return json({ error: "Invalid card number" }, 400);
      const masked = `**** **** **** ${digits.slice(-4)}`;
      // sandbox/live tokenization — store provider token reference, not the PAN
      const token = providerMode(provider) === "live"
        ? `tok_${provider}_${digits.slice(-4)}_${Date.now()}` // real flow returns token from provider widget
        : `tok_sbx_${digits.slice(-4)}_${Date.now()}`;

      const { data: existing } = await supabase.from("payout_methods")
        .select("id").eq("supplier_id", supplier_id).eq("is_default", true).maybeSingle();
      const payload = { provider, type: "card", masked_pan: masked, card_token: token, holder: holder || null };
      if (existing) await supabase.from("payout_methods").update(payload).eq("id", existing.id);
      else await supabase.from("payout_methods").insert({ supplier_id, is_default: true, ...payload });

      return json({ success: true, masked_pan: masked, mode: providerMode(provider) });
    }

    // ---------------- run_accruals (internal) ----------------
    // Convert eligible paid splits into +drop accruals and -markup debits on the balance.
    if (action === "run_accruals") {
      if (!isInternal && !isAdmin) return json({ error: "Forbidden" }, 403);
      const nowIso = new Date().toISOString();
      const { data: due } = await supabase.from("order_splits")
        .select("*").eq("payout_stage", "created")
        .not("eligible_payout_at", "is", null).lte("eligible_payout_at", nowIso)
        .is("balance_movement_id", null).limit(100);

      const processed: string[] = [];
      for (const s of due || []) {
        // +supplier_amount (we owe supplier for the drop cost)
        const accrual = await applyMovement(supabase, s.supplier_id, {
          type: "payout_accrual", amount: Number(s.supplier_amount), provider: "internal",
          order_split_id: s.id, description: `Нарахування за замовлення ${s.order_id?.slice(0, 8)}`,
        });
        // COD: supplier received full cash at delivery, owes us the markup → -commission
        const isCod = s.payout_type === "partial_markup" || s.payment_method === "cod" || s.payment_method === "cash_on_delivery";
        if (isCod && Number(s.platform_commission) > 0) {
          await applyMovement(supabase, s.supplier_id, {
            type: "markup_debit", amount: -Number(s.platform_commission), provider: "internal",
            order_split_id: s.id, description: `Наша націнка (наложений) ${s.order_id?.slice(0, 8)}`,
          });
        }
        await supabase.from("order_splits").update({
          payout_stage: "paid", split_status: "accrued", paid_at: nowIso, balance_movement_id: accrual.movement.id,
        }).eq("id", s.id);
        processed.push(s.id);
      }
      return json({ success: true, accrued: processed.length });
    }

    // ---------------- request_withdrawal (supplier manual) / admin_payout ----------------
    if (action === "request_withdrawal" || action === "admin_payout") {
      const { supplier_id } = body;
      if (!supplier_id) return json({ error: "supplier_id required" }, 400);
      if (action === "admin_payout" && !isAdmin && !isInternal) return json({ error: "Forbidden: admin required" }, 403);
      if (action === "request_withdrawal" && !isStaff && !(profileId && await canManageSupplier(supabase, profileId, supplier_id, telegramId)))
        return json({ error: "Forbidden" }, 403);

      const { data: bal } = await supabase.from("shop_balances").select("*").eq("supplier_id", supplier_id).maybeSingle();
      const { data: method } = await supabase.from("payout_methods")
        .select("*").eq("supplier_id", supplier_id).eq("is_default", true).maybeSingle();
      const { data: sup } = await supabase.from("suppliers")
        .select("payment_iban, payment_card_holder").eq("id", supplier_id).single();

      const available = Number(bal?.available || 0);
      const min = Number(method?.min_withdraw || 0);
      const amount = Number(body.amount || available);
      if (available <= 0 || amount <= 0) return json({ error: "Недостатньо коштів на балансі" }, 400);
      if (amount > available) return json({ error: "Сума перевищує доступний баланс" }, 400);
      if (action === "request_withdrawal" && amount < min) return json({ error: `Мінімальна сума виводу ${min}₴` }, 400);

      const provider = method?.provider || "liqpay";
      const dest = { iban: method?.iban || sup?.payment_iban, card_token: method?.card_token, holder: method?.holder || sup?.payment_card_holder };
      const result = await providerPayout(provider, amount, dest);
      if (!result.ok) {
        await applyMovement(supabase, supplier_id, {
          type: "withdrawal", amount: -amount, status: "failed", provider,
          description: `Помилка виводу: ${result.error || "невідомо"}`,
        });
        return json({ error: "Переказ не вдався", detail: result.error }, 502);
      }
      const mv = await applyMovement(supabase, supplier_id, {
        type: "withdrawal", amount: -amount, status: "settled", provider, external_tx_id: result.tx_id,
        description: `Вивід коштів (${result.mode})`,
      });
      // record in supplier_payouts for history compatibility
      await supabase.from("supplier_payouts").insert({
        supplier_id, amount, payout_method: `${provider}_${result.mode}`,
        payout_status: "completed", iban: dest.iban || null, transaction_id: result.tx_id, processed_at: new Date().toISOString(),
      });
      return json({ success: true, tx_id: result.tx_id, mode: result.mode, balance_after: mv.balance_after });
    }

    // ---------------- run_auto_withdrawals (internal cron) ----------------
    if (action === "run_auto_withdrawals") {
      if (!isInternal && !isAdmin) return json({ error: "Forbidden" }, 403);
      const { data: methods } = await supabase.from("payout_methods").select("*").eq("auto_withdraw", true);
      const results: any[] = [];
      for (const method of methods || []) {
        const { data: bal } = await supabase.from("shop_balances").select("*").eq("supplier_id", method.supplier_id).maybeSingle();
        const available = Number(bal?.available || 0);
        if (available < Number(method.min_withdraw || 0) || available <= 0) continue;
        const provider = method.provider || "liqpay";
        const result = await providerPayout(provider, available, { iban: method.iban, card_token: method.card_token, holder: method.holder });
        if (!result.ok) continue;
        const mv = await applyMovement(supabase, method.supplier_id, {
          type: "withdrawal", amount: -available, provider, external_tx_id: result.tx_id, description: `Авто-вивід (${result.mode})`,
        });
        await supabase.from("supplier_payouts").insert({
          supplier_id: method.supplier_id, amount: available, payout_method: `${provider}_auto`,
          payout_status: "completed", iban: method.iban || null, transaction_id: result.tx_id, processed_at: new Date().toISOString(),
        });
        results.push({ supplier_id: method.supplier_id, amount: available, tx_id: result.tx_id, balance_after: mv.balance_after });
      }
      return json({ success: true, withdrawals: results.length, results });
    }

    // ---------------- charge_markup (admin/internal) ----------------
    // Auto-debit our markup from the supplier's bound card (COD), if allowed.
    if (action === "charge_markup") {
      if (!isAdmin && !isInternal) return json({ error: "Forbidden" }, 403);
      const { supplier_id, amount } = body;
      if (!supplier_id || !amount) return json({ error: "supplier_id and amount required" }, 400);
      const { data: method } = await supabase.from("payout_methods")
        .select("*").eq("supplier_id", supplier_id).eq("is_default", true).maybeSingle();
      if (!method?.card_token || !method?.auto_charge)
        return json({ error: "Авто-списання не дозволено постачальником" }, 400);
      const result = await providerCharge(method.provider || "liqpay", Number(amount), method.card_token);
      if (!result.ok) return json({ error: "Списання не вдалося", detail: result.error }, 502);
      const mv = await applyMovement(supabase, supplier_id, {
        type: "card_charge", amount: Number(amount), provider: method.provider || "liqpay",
        external_tx_id: result.tx_id, description: `Списання націнки з картки (${result.mode})`,
      });
      return json({ success: true, tx_id: result.tx_id, mode: result.mode, balance_after: mv.balance_after });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("bank-gateway error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
