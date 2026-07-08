import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Wallet, Loader2, Store, TrendingUp, Clock, Package,
  Banknote, BarChart3, Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SupplierBalanceCard } from "@/components/supplier/SupplierBalanceCard";
import { ShopPaymentsView } from "@/components/supplier/ShopPaymentsView";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hapticSelection } from "@/lib/haptics";

type Period = "day" | "week" | "month" | "year";

interface ShopRow {
  supplier_id: string;
  shop_name: string;
  logo_url: string | null;
  is_active: boolean;
  role?: "owner" | "manager" | "staff";
  canManage?: boolean;
  available: number;
  pending: number;
  lifetime_paid: number;
}

interface Totals {
  turnover: number;
  earned: number;
  processing: number;
  productsSold: number;
  productsAmount: number;
  ordersCount: number;
}

interface SeriesPoint {
  label: string;
  turnover: number;
  earned: number;
  productsSold: number;
  amount: number;
}

const periodLabels: Record<Period, string> = { day: "День", week: "Тиждень", month: "Місяць", year: "Рік" };
const fmt = (n: number) => Number(n || 0).toLocaleString("uk-UA");

export default function SupplierBalance() {
  const navigate = useNavigate();
  const { supplierId: paramSupplierId } = useParams<{ supplierId?: string }>();
  const { sessionToken, devRoleOverride } = useTelegramAuthContext();

  const [loadingShops, setLoadingShops] = useState(true);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [selected, setSelected] = useState<string>(paramSupplierId || "all");

  const [loadingStats, setLoadingStats] = useState(true);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [series, setSeries] = useState<Record<Period, SeriesPoint[]>>({ day: [], week: [], month: [], year: [] });
  const [period, setPeriod] = useState<Period>("month");

  const loadShops = useCallback(async () => {
    if (!sessionToken) return;
    setLoadingShops(true);
    try {
      const { data, error } = await supabase.functions.invoke("bank-gateway", {
        body: { action: "list_my_shops", session_token: sessionToken, preview_role: devRoleOverride || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setShops(data?.rows || []);
    } catch (e: any) {
      toast.error("Не вдалося завантажити магазини");
    } finally {
      setLoadingShops(false);
    }
  }, [sessionToken, devRoleOverride]);

  const loadStats = useCallback(async () => {
    if (!sessionToken) return;
    setLoadingStats(true);
    try {
      const body: Record<string, any> = { action: "get_stats", session_token: sessionToken, preview_role: devRoleOverride || undefined };
      if (selected !== "all") body.supplier_id = selected;
      const { data, error } = await supabase.functions.invoke("bank-gateway", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTotals(data?.totals || null);
      setSeries(data?.series || { day: [], week: [], month: [], year: [] });
    } catch (e: any) {
      toast.error("Не вдалося завантажити статистику");
    } finally {
      setLoadingStats(false);
    }
  }, [sessionToken, selected, devRoleOverride]);

  useEffect(() => { loadShops(); }, [loadShops]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const consolidatedAvailable = shops.reduce((s, r) => s + Number(r.available || 0), 0);
  const consolidatedPaid = shops.reduce((s, r) => s + Number(r.lifetime_paid || 0), 0);
  const points = series[period] || [];
  const maxVal = Math.max(1, ...points.map((p) => p.turnover));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Рахунок постачальника</h1>
            <p className="text-sm text-muted-foreground">Баланс, виплати та статистика</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-28">
        {/* Consolidated balance */}
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Загальний баланс (усі магазини)</p>
                <p className="text-2xl font-bold">{fmt(consolidatedAvailable)} ₴</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Banknote className="h-3.5 w-3.5" />
              Всього виплачено: <span className="font-semibold text-foreground">{fmt(consolidatedPaid)} ₴</span>
            </div>
          </CardContent>
        </Card>

        {/* Shop selector */}
        {loadingShops ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <button
                onClick={() => { hapticSelection(); setSelected("all"); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all shrink-0",
                  selected === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/50"
                )}
              >
                <Layers className="h-4 w-4" /> Усі магазини
              </button>
              {shops.map((s) => (
                <button
                  key={s.supplier_id}
                  onClick={() => { hapticSelection(); setSelected(s.supplier_id); }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all shrink-0",
                    selected === s.supplier_id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/50"
                  )}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={s.logo_url || undefined} alt={s.shop_name} />
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{s.shop_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="max-w-[120px] truncate">{s.shop_name}</span>
                  <span className={cn("text-[11px]", selected === s.supplier_id ? "opacity-90" : "text-muted-foreground")}>
                    {fmt(s.available)}₴
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Stat cards */}
        {loadingStats || !totals ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" /> Зароблено
                  </div>
                  <p className="text-lg font-bold text-foreground">{fmt(totals.earned)} ₴</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> В обробці
                  </div>
                  <p className="text-lg font-bold text-foreground">{fmt(totals.processing)} ₴</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Package className="h-3.5 w-3.5 text-primary" /> Продано товарів
                  </div>
                  <p className="text-lg font-bold text-foreground">{fmt(totals.productsSold)}</p>
                  <p className="text-[11px] text-muted-foreground">на {fmt(totals.productsAmount)} ₴</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <BarChart3 className="h-3.5 w-3.5 text-blue-500" /> Оборот
                  </div>
                  <p className="text-lg font-bold text-foreground">{fmt(totals.turnover)} ₴</p>
                  <p className="text-[11px] text-muted-foreground">{fmt(totals.ordersCount)} замовлень</p>
                </CardContent>
              </Card>
            </div>

            {/* Period breakdown */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Розбивка по періодам</span>
                </div>
                <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                  <TabsList className="grid grid-cols-4 w-full h-9">
                    {(["day", "week", "month", "year"] as Period[]).map((p) => (
                      <TabsTrigger key={p} value={p} className="text-xs">{periodLabels[p]}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="space-y-1.5">
                  {points.every((p) => p.turnover === 0 && p.productsSold === 0) ? (
                    <p className="text-center text-sm text-muted-foreground py-6">Немає даних за цей період</p>
                  ) : (
                    points.map((p, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground w-20 shrink-0">{p.label}</span>
                          <div className="flex-1 mx-2 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${(p.turnover / maxVal) * 100}%` }} />
                          </div>
                          <span className="font-semibold text-foreground w-24 text-right">{fmt(p.turnover)} ₴</span>
                        </div>
                        <div className="flex items-center justify-end gap-3 text-[10px] text-muted-foreground pr-1">
                          <span className="flex items-center gap-0.5"><Package className="h-2.5 w-2.5" /> {fmt(p.productsSold)} шт</span>
                          <span className="flex items-center gap-0.5"><TrendingUp className="h-2.5 w-2.5 text-green-600" /> {fmt(p.earned)} ₴</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Per-shop balance management (withdraw / card) — only when a shop is selected */}
        {selected !== "all" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mt-2">
              <Store className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Керування рахунком магазину</span>
            </div>
            {shops.find((s) => s.supplier_id === selected)?.role === "manager" && (
              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Режим перегляду менеджера — ви бачите чи надійшли кошти, але виплатами та карткою керує власник.
              </div>
            )}
            <SupplierBalanceCard
              supplierId={selected}
              readOnly={shops.find((s) => s.supplier_id === selected)?.role === "manager"}
            />
          </div>
        )}

        {selected === "all" && shops.length > 0 && (
          <p className="text-center text-xs text-muted-foreground pt-2">
            Оберіть магазин вище, щоб вивести кошти або прив'язати картку
          </p>
        )}

        {!loadingShops && shops.length === 0 && (
          <div className="text-center py-10">
            <Store className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">У вас ще немає магазинів</p>
          </div>
        )}
      </div>
    </div>
  );
}
