import { motion } from "framer-motion";
import { Store, ChevronRight, Clock, TrendingUp, Lock } from "lucide-react";
import type { ShopSummary, ShopsTotals } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

interface ShopBalancesListProps {
  shops: ShopSummary[];
  totals: ShopsTotals | null;
  onOpenShop: (id: string) => void;
}

const uah = (v: number) => `${Number(v || 0).toLocaleString("uk-UA")}₴`;

export function ShopBalancesList({ shops, totals, onOpenShop }: ShopBalancesListProps) {
  if (shops.length === 0) {
    return (
      <div className="rounded-xl border border-border p-8 text-center">
        <Store className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Магазинів поки немає</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {totals && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-gradient-to-br from-success/15 via-success/5 to-transparent p-4"
        >
          <p className="text-xs text-muted-foreground">Загальний баланс магазинів</p>
          <p className="text-3xl font-bold text-foreground mt-0.5">{uah(totals.available)}</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <MiniStat label="В обробці" value={uah(totals.pending)} />
            <MiniStat label="Виплачено" value={uah(totals.lifetime_paid)} />
            <MiniStat label="Замовлень" value={String(totals.orders)} />
          </div>
        </motion.div>
      )}

      {shops.map((shop, i) => (
        <motion.button
          key={shop.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * i }}
          onClick={() => onOpenShop(shop.id)}
          className="w-full text-left rounded-xl border border-border bg-card p-3.5 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.shop_name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Store className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm text-foreground truncate">{shop.shop_name}</p>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full shrink-0",
                  shop.role === "owner" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {shop.role === "owner" ? "Власник" : "Менеджер"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {shop.orders} замовлень · оборот {uah(shop.turnover)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-bold text-foreground">
                {shop.role === "manager" ? <Lock className="h-4 w-4 text-muted-foreground inline" /> : uah(shop.available)}
              </p>
              <p className="text-[10px] text-muted-foreground">доступно</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <Chip icon={Clock} label="В обробці" value={uah(shop.pending)} />
            <Chip icon={TrendingUp} label="Виплачено" value={uah(shop.lifetime_paid)} />
            <Chip icon={Clock} label="Очікує виплат" value={String(shop.awaiting_payout)} highlight={shop.awaiting_payout > 0} />
          </div>
        </motion.button>
      ))}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card/70 border border-border p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Chip({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-2", highlight ? "border-warning/40 bg-warning/5" : "border-border bg-muted/30")}>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Icon className="h-2.5 w-2.5" /> {label}
      </p>
      <p className={cn("text-xs font-semibold", highlight ? "text-warning" : "text-foreground")}>{value}</p>
    </div>
  );
}
