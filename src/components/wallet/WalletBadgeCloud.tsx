import { useEffect, useState } from "react";
import { DollarSign, Star, Plus, ArrowUpRight, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletBadgeCloudProps {
  /** Показувати позначку реальних коштів (для постачальників) */
  showCash?: boolean;
  bonusValue?: number;
  cashValue?: number;
  onClick?: () => void;
  className?: string;
  /** Швидкі дії */
  onTopUp?: () => void;
  onPayout?: () => void;
  onPay?: () => void;
  showPayout?: boolean;
}

const fmt = (v: number) =>
  v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v));

/**
 * Анімована "хмаринка" зі стрілкою до кнопки гаманця:
 * позначки $ (реальні кошти) і ★ (бонуси) блимають по черзі.
 */
export function WalletBadgeCloud({
  showCash = false,
  bonusValue = 0,
  cashValue = 0,
  onClick,
  className,
  onTopUp,
  onPayout,
  onPay,
  showPayout = false,
}: WalletBadgeCloudProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const hasActions = Boolean(onTopUp || onPayout || onPay);

  return (
    <div
      className={cn(
        "absolute top-full right-0 mt-1.5 z-30 flex flex-col items-end gap-1 animate-cloud-float",
        className,
      )}
    >
      <button type="button" onClick={onClick} aria-label="Мій рахунок" className="relative">
        {/* хвостик хмаринки */}
        <span className="absolute -top-1 right-4 w-3 h-3 rotate-45 rounded-[3px] bg-card border-l border-t border-primary/40" />

        <span className="relative flex items-center gap-1.5 rounded-full border border-primary/40 bg-card px-2.5 py-1 shadow-[0_4px_14px_-6px_hsl(var(--primary)/0.6)]">
          <span className="absolute inset-0 rounded-full animate-glow-pulse pointer-events-none" />

          {showCash && (
            <span className="flex items-center gap-0.5 animate-badge-swap">
              <span className="w-4 h-4 rounded-full bg-success/15 flex items-center justify-center">
                <DollarSign className="h-2.5 w-2.5 text-success" />
              </span>
              <span className="text-[10px] font-bold text-success">{fmt(cashValue)}</span>
            </span>
          )}

          <span className={cn("flex items-center gap-0.5", showCash && "animate-badge-swap-alt")}>
            <span className="w-4 h-4 rounded-full bg-rating/15 flex items-center justify-center">
              <Star className="h-2.5 w-2.5 text-rating fill-rating" />
            </span>
            <span className="text-[10px] font-bold text-rating">{fmt(bonusValue)}</span>
          </span>
        </span>
      </button>

      {hasActions && (
        <div className="flex items-center gap-1">
          {onTopUp && (
            <button
              type="button"
              onClick={onTopUp}
              aria-label="Поповнити"
              className="flex items-center gap-0.5 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[9px] font-semibold shadow-sm active:scale-95 transition-transform"
            >
              <Plus className="h-2.5 w-2.5" /> Поповнити
            </button>
          )}
          {onPayout && showPayout && (
            <button
              type="button"
              onClick={onPayout}
              aria-label="Вивести"
              className="flex items-center gap-0.5 rounded-full border border-success/40 bg-card text-success px-2 py-0.5 text-[9px] font-semibold shadow-sm active:scale-95 transition-transform"
            >
              <ArrowUpRight className="h-2.5 w-2.5" /> Вивести
            </button>
          )}
          {onPay && (
            <button
              type="button"
              onClick={onPay}
              aria-label="Оплатити замовлення"
              className="flex items-center gap-0.5 rounded-full border border-primary/40 bg-card text-primary px-2 py-0.5 text-[9px] font-semibold shadow-sm active:scale-95 transition-transform"
            >
              <ShoppingBag className="h-2.5 w-2.5" /> Оплатити
            </button>
          )}
        </div>
      )}
    </div>
  );
}
