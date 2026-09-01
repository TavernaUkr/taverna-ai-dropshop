import { Plus, ArrowUpRight, ShoppingBag } from "lucide-react";
import { hapticSelection } from "@/lib/haptics";

interface WalletActionBarProps {
  /** Показувати грошові дії (поповнити / вивести) */
  showCash?: boolean;
  canPayout?: boolean;
  onTopUp?: () => void;
  onPayout?: () => void;
  onPay?: () => void;
}

/** Липка нижня панель дій рахунку. */
export function WalletActionBar({ showCash = false, canPayout = true, onTopUp, onPayout, onPay }: WalletActionBarProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2 max-w-lg mx-auto">
        {showCash && (
          <button
            onClick={() => { hapticSelection(); onTopUp?.(); }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4" /> Поповнити
          </button>
        )}
        {showCash && canPayout && (
          <button
            onClick={() => { hapticSelection(); onPayout?.(); }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-success/40 bg-card text-success py-2.5 text-sm font-semibold active:scale-95 transition-transform"
          >
            <ArrowUpRight className="h-4 w-4" /> Вивести
          </button>
        )}
        <button
          onClick={() => { hapticSelection(); onPay?.(); }}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-card text-primary py-2.5 text-sm font-semibold active:scale-95 transition-transform"
        >
          <ShoppingBag className="h-4 w-4" /> Оплатити
        </button>
      </div>
    </div>
  );
}
