import { useState } from "react";
import { motion } from "framer-motion";
import { Store, ChevronRight, Clock, TrendingUp, Lock, Zap, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hapticSelection } from "@/lib/haptics";
import type { ShopSummary, ShopsTotals } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

interface ShopBalancesListProps {
  shops: ShopSummary[];
  totals: ShopsTotals | null;
  onOpenShop: (id: string) => void;
  /** Зберегти налаштування автовиводу для магазину */
  onSaveAuto?: (supplierId: string, patch: Record<string, unknown>) => void | Promise<unknown>;
  /** Тільки перегляд (менеджер магазину) */
  readOnly?: boolean;
}

const uah = (v: number) => `${Number(v || 0).toLocaleString("uk-UA")}₴`;

const PROVIDERS: { id: string; label: string }[] = [
  { id: "telegram_wallet", label: "Wallet" },
  { id: "card", label: "Картка" },
  { id: "iban", label: "IBAN" },
];

export function ShopBalancesList({ shops, totals, onOpenShop, onSaveAuto, readOnly }: ShopBalancesListProps) {
  const [openAuto, setOpenAuto] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMin, setBulkMin] = useState("500");
  const [bulkProvider, setBulkProvider] = useState("telegram_wallet");

  const ownedShops = shops.filter((s) => s.role === "owner");
  const canManage = !readOnly && !!onSaveAuto && ownedShops.length > 0;

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
          <p className="text-xs text-muted-foreground">Загальний баланс магазинів · доступно до виводу</p>
          <p className="text-3xl font-bold text-foreground mt-0.5">{uah(totals.available)}</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <MiniStat label="В обробці" value={uah(totals.pending)} />
            <MiniStat label="Виплачено" value={uah(totals.lifetime_paid)} />
            <MiniStat label="Замовлень" value={String(totals.orders)} />
          </div>

          {canManage && (
            <div className="mt-3">
              <button
                onClick={() => { hapticSelection(); setBulkOpen((v) => !v); }}
                className="w-full h-9 rounded-lg border border-primary/40 bg-card text-primary text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" /> Автовивід усім магазинам
              </button>

              {bulkOpen && (
                <div className="mt-2 rounded-xl border border-border bg-card p-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Однакові правила для {ownedShops.length} магазин(ів), де ви власник
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={bulkMin}
                      onChange={(e) => setBulkMin(e.target.value.replace(/[^\d]/g, ""))}
                      className="h-9 text-xs"
                      placeholder="Мін. сума, ₴"
                    />
                    <div className="flex gap-1">
                      {PROVIDERS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setBulkProvider(p.id)}
                          className={cn(
                            "px-2 h-9 rounded-lg border text-[11px]",
                            bulkProvider === p.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground",
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="w-full h-9 text-xs"
                    onClick={async () => {
                      hapticSelection();
                      for (const s of ownedShops) {
                        await onSaveAuto?.(s.id, {
                          auto_withdraw: true,
                          auto_withdraw_min: Number(bulkMin || 500),
                          payout_provider: bulkProvider,
                        });
                      }
                      setBulkOpen(false);
                    }}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Увімкнути для всіх
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {shops.map((shop, i) => (
        <motion.div
          key={shop.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * i }}
          className="rounded-xl border border-border bg-card p-3.5"
        >
          <button onClick={() => onOpenShop(shop.id)} className="w-full text-left active:scale-[0.99] transition-transform">
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
                <p className="text-base font-bold text-foreground">{uah(shop.available)}</p>
                <p className="text-[10px] text-muted-foreground">доступно</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <Chip icon={Clock} label="В обробці" value={uah(shop.pending)} />
              <Chip icon={TrendingUp} label="Виплачено" value={uah(shop.lifetime_paid)} />
              <Chip icon={Clock} label="Очікує виплат" value={String(shop.awaiting_payout)} highlight={shop.awaiting_payout > 0} />
            </div>
          </button>

          {/* Автовивід для конкретного магазину */}
          {readOnly || shop.role === "manager" ? (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border pt-2.5">
              <Lock className="h-3 w-3" /> Керування коштами доступне лише власнику
            </div>
          ) : (
            <ShopAutoPayout
              shop={shop}
              open={openAuto === shop.id}
              onToggleOpen={() => setOpenAuto(openAuto === shop.id ? null : shop.id)}
              onSave={(patch) => onSaveAuto?.(shop.id, patch)}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function ShopAutoPayout({
  shop, open, onToggleOpen, onSave,
}: {
  shop: ShopSummary;
  open: boolean;
  onToggleOpen: () => void;
  onSave: (patch: Record<string, unknown>) => void | Promise<unknown>;
}) {
  const [min, setMin] = useState(String(shop.auto_withdraw_min ?? 500));
  const [provider, setProvider] = useState(shop.payout_provider || "telegram_wallet");
  const enabled = !!shop.auto_withdraw;

  return (
    <div className="mt-3 border-t border-border pt-2.5">
      <div className="flex items-center justify-between">
        <button onClick={() => { hapticSelection(); onToggleOpen(); }} className="flex items-center gap-1.5 text-xs">
          <Zap className={cn("h-3.5 w-3.5", enabled ? "text-success" : "text-muted-foreground")} />
          <span className={cn("font-medium", enabled ? "text-success" : "text-muted-foreground")}>
            Автовивід {enabled ? `від ${Number(shop.auto_withdraw_min ?? 0).toLocaleString("uk-UA")}₴` : "вимкнено"}
          </span>
        </button>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onSave({ auto_withdraw: v, auto_withdraw_min: Number(min || 500), payout_provider: provider })}
        />
      </div>

      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Input
              value={min}
              onChange={(e) => setMin(e.target.value.replace(/[^\d]/g, ""))}
              className="h-9 text-xs"
              placeholder="Мін. сума, ₴"
            />
            <div className="flex gap-1">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={cn(
                    "px-2 h-9 rounded-lg border text-[11px]",
                    provider === p.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full h-9 text-xs"
            onClick={() => onSave({ auto_withdraw: true, auto_withdraw_min: Number(min || 500), payout_provider: provider })}
          >
            Зберегти правила автовиводу
          </Button>
        </div>
      )}
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
