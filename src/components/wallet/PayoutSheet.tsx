import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Loader2, Store, Wallet as WalletIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { WalletLimit, WalletState } from "@/hooks/useWallet";
import { calcPayoutFees, PLATFORM_PAYOUT_FEE_PERCENT, PLATFORM_PAYOUT_FEE_MIN } from "@/lib/payoutFees";

const PAYOUT_PROVIDERS = [
  { id: "telegram_wallet", label: "Telegram Wallet", placeholder: "UQ... / USDT адреса" },
  { id: "card", label: "Картка", placeholder: "0000 0000 0000 0000" },
  { id: "iban", label: "IBAN", placeholder: "UA00 0000 0000 0000 0000 0000 000" },
];

export interface PayoutSource {
  /** null = особистий гаманець */
  id: string | null;
  name: string;
  available: number;
  pending?: number;
}

interface PayoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: WalletState;
  limits: WalletLimit[];
  /** Джерела списання: магазини постачальника + особистий гаманець */
  sources?: PayoutSource[];
  onPayout: (amount: number, provider: string, destination?: string, sourceShopId?: string) => Promise<unknown>;
}

const SOURCE_PERSONAL = "__personal__";

export function PayoutSheet({ open, onOpenChange, wallet, limits, sources = [], onPayout }: PayoutSheetProps) {
  const [provider, setProvider] = useState(wallet.payout_provider || "telegram_wallet");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState(wallet.tg_wallet_address || "");
  const [isBusy, setIsBusy] = useState(false);
  const [sourceKey, setSourceKey] = useState<string>("");

  const needsSource = sources.length > 0;

  useEffect(() => {
    if (!open) return;
    setSourceKey(sources.length === 1 ? (sources[0].id ?? SOURCE_PERSONAL) : "");
    setAmount("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const source = useMemo(
    () => sources.find((s) => (s.id ?? SOURCE_PERSONAL) === sourceKey) || null,
    [sources, sourceKey],
  );

  const available = needsSource ? Number(source?.available || 0) : Number(wallet.balance || 0);

  const limit = useMemo(() => limits.find((l) => l.provider === provider), [limits, provider]);
  const value = Number(amount) || 0;
  const { platformFee, providerFee, totalFee, net } = useMemo(() => calcPayoutFees(value, limit), [value, limit]);

  const submit = async () => {
    if (needsSource && !source) return toast.error("Оберіть магазин для списання");
    if (!value) return toast.error("Вкажіть суму виводу");
    if (value > available) return toast.error("Недостатньо коштів на обраному рахунку");
    if (limit && value < limit.min_payout) return toast.error(`Мінімум ${limit.min_payout}₴`);
    if (net <= 0) return toast.error("Сума менша за комісію виводу");
    setIsBusy(true);
    try {
      await onPayout(value, provider, destination, source?.id ?? undefined);
      toast.success("Запит на вивід створено");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не вдалося вивести кошти");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Вивести кошти</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {needsSource && (
            <div className="space-y-1.5">
              <Label className="text-xs">Оберіть магазин для списання</Label>
              <Select value={sourceKey} onValueChange={setSourceKey}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Оберіть магазин для списання" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => {
                    const key = s.id ?? SOURCE_PERSONAL;
                    const Icon = s.id ? Store : WalletIcon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{s.name}</span>
                          <span className="ml-2 text-xs font-semibold text-success">
                            {Number(s.available).toLocaleString("uk-UA")}₴
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {source && (source.pending ?? 0) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  В обробці по цьому рахунку: {Number(source.pending).toLocaleString("uk-UA")}₴ — стануть доступні після завершення замовлень
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {PAYOUT_PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={cn(
                  "rounded-xl border p-2.5 text-xs font-medium transition-all",
                  provider === p.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Сума, ₴ (доступно {available.toLocaleString("uk-UA")}₴)</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              className="h-12 text-lg font-semibold"
              placeholder="0"
              disabled={needsSource && !source}
            />
            <button
              className="text-xs text-primary disabled:opacity-50"
              disabled={needsSource && !source}
              onClick={() => setAmount(String(available))}
            >
              Вивести все
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Реквізити</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={PAYOUT_PROVIDERS.find((p) => p.id === provider)?.placeholder}
            />
          </div>

          <div className="rounded-xl border border-border p-3 text-xs space-y-1">
            {limit && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ліміти</span>
                  <span className="text-foreground">{limit.min_payout}₴ – {limit.max_payout.toLocaleString("uk-UA")}₴</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Добовий ліміт</span>
                  <span className="text-foreground">{limit.daily_limit.toLocaleString("uk-UA")}₴</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Комісія платформи ({PLATFORM_PAYOUT_FEE_PERCENT}%, мін. {PLATFORM_PAYOUT_FEE_MIN}₴)
              </span>
              <span className="text-foreground">−{platformFee.toLocaleString("uk-UA")}₴</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Комісія методу</span>
              <span className="text-foreground">−{providerFee.toLocaleString("uk-UA")}₴</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="text-muted-foreground">Разом комісія</span>
              <span className="text-foreground">−{totalFee.toLocaleString("uk-UA")}₴</span>
            </div>
            <div className="flex justify-between font-semibold text-sm">
              <span className="text-muted-foreground">Отримаєте на руки</span>
              <span className="text-success">{net.toLocaleString("uk-UA")}₴</span>
            </div>
            {limit && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Термін</span>
                <span className="text-foreground">{limit.eta_text || "—"}</span>
              </div>
            )}
          </div>

          <Button className="w-full h-12" onClick={submit} disabled={isBusy || (needsSource && !source)}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
            {needsSource && !source ? "Оберіть магазин" : "Вивести"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
