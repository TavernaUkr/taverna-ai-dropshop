import { useMemo, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { WalletLimit, WalletState } from "@/hooks/useWallet";
import { calcPayoutFees, PLATFORM_PAYOUT_FEE_PERCENT, PLATFORM_PAYOUT_FEE_MIN } from "@/lib/payoutFees";

const PAYOUT_PROVIDERS = [
  { id: "telegram_wallet", label: "Telegram Wallet", placeholder: "UQ... / USDT адреса" },
  { id: "card", label: "Картка", placeholder: "0000 0000 0000 0000" },
  { id: "iban", label: "IBAN", placeholder: "UA00 0000 0000 0000 0000 0000 000" },
];

interface PayoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: WalletState;
  limits: WalletLimit[];
  onPayout: (amount: number, provider: string, destination?: string) => Promise<unknown>;
}

export function PayoutSheet({ open, onOpenChange, wallet, limits, onPayout }: PayoutSheetProps) {
  const [provider, setProvider] = useState(wallet.payout_provider || "telegram_wallet");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState(wallet.tg_wallet_address || "");
  const [isBusy, setIsBusy] = useState(false);

  const limit = useMemo(() => limits.find((l) => l.provider === provider), [limits, provider]);
  const value = Number(amount) || 0;
  const { platformFee, providerFee, totalFee, net } = useMemo(() => calcPayoutFees(value, limit), [value, limit]);

  const submit = async () => {
    if (!value) return toast.error("Вкажіть суму виводу");
    if (value > wallet.balance) return toast.error("Недостатньо коштів");
    if (limit && value < limit.min_payout) return toast.error(`Мінімум ${limit.min_payout}₴`);
    if (net <= 0) return toast.error("Сума менша за комісію виводу");
    setIsBusy(true);
    try {
      await onPayout(value, provider, destination);
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
            <Label className="text-xs">Сума, ₴ (доступно {wallet.balance.toLocaleString("uk-UA")}₴)</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              className="h-12 text-lg font-semibold"
              placeholder="0"
            />
            <button className="text-xs text-primary" onClick={() => setAmount(String(wallet.balance))}>
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

          <Button className="w-full h-12" onClick={submit} disabled={isBusy}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpRight className="h-4 w-4 mr-2" />}
            Вивести
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
