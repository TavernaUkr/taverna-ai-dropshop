import { useState } from "react";
import { ShoppingCart, Search, Heart, Gift, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import tavernaLogo from "@/assets/taverna-logo.png";
import { AppInfoModal } from "./AppInfoModal";

interface HeaderProps {
  cartCount?: number;
  favoritesCount?: number;
  onCartClick?: () => void;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onFavoritesClick?: () => void;
  onPromoClick?: () => void;
}

export const Header = ({
  cartCount = 0,
  favoritesCount = 0,
  onCartClick,
  onSearchClick,
  onNotificationsClick,
  onFavoritesClick,
  onPromoClick,
}: HeaderProps) => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center justify-between h-[72px] px-4">
          {/* Logo with Info Button */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <img 
                src={tavernaLogo} 
                alt="Taverna Group" 
                className="w-12 h-12 rounded-xl object-cover shadow-md"
              />
              <button
                onClick={() => setIsInfoOpen(true)}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md hover:bg-primary/90 active:scale-95 transition-all"
                aria-label="Інформація про додаток"
              >
                <Info className="h-3 w-3 text-primary-foreground" />
              </button>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-foreground leading-tight">Taverna</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Group</span>
            </div>
          </div>

          {/* Center - Promo Button */}
          <button
            onClick={onPromoClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-live to-warning text-live-foreground font-semibold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all animate-pulse-slow"
          >
            <Gift className="h-4 w-4" />
            <span>Акції</span>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onSearchClick}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={onFavoritesClick}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            >
              <Heart className="h-5 w-5" />
              {favoritesCount > 0 && (
                <span className={cn(
                  "absolute -top-0.5 -right-0.5",
                  "min-w-[18px] h-[18px] px-1",
                  "flex items-center justify-center",
                  "bg-live text-live-foreground",
                  "text-[10px] font-bold rounded-full shadow-md"
                )}>
                  {favoritesCount > 99 ? "99+" : favoritesCount}
                </span>
              )}
            </button>

            <button
              onClick={onCartClick}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className={cn(
                  "absolute -top-0.5 -right-0.5",
                  "min-w-[20px] h-[20px] px-1",
                  "flex items-center justify-center",
                  "bg-live text-live-foreground",
                  "text-[10px] font-bold rounded-full shadow-md"
                )}>
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <AppInfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
    </>
  );
};
