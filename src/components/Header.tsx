import { useState } from "react";
import { ShoppingCart, Search, Heart, Gift, Info, Star, Trophy, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import tavernaLogo from "@/assets/taverna-logo.png";
import { AppInfoModal } from "./AppInfoModal";
import { AppRatingModal } from "./AppRatingModal";

interface HeaderProps {
  cartCount?: number;
  favoritesCount?: number;
  onCartClick?: () => void;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onFavoritesClick?: () => void;
  onPromoClick?: () => void;
  onRatingsClick?: () => void;
}

export const Header = ({
  cartCount = 0,
  favoritesCount = 0,
  onCartClick,
  onSearchClick,
  onNotificationsClick,
  onFavoritesClick,
  onPromoClick,
  onRatingsClick,
}: HeaderProps) => {
  const navigate = useNavigate();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

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
            {/* App Rating Button */}
            <button
              onClick={() => setIsRatingOpen(true)}
              className="ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-warning/10 hover:bg-warning/20 active:scale-95 transition-all"
              aria-label="Оцінити додаток"
            >
              <Star className="h-3 w-3 text-warning fill-warning" />
              <span className="text-[10px] font-medium text-warning">Оцінити</span>
            </button>
          </div>

          {/* Center - Ratings Button */}
          <button
            onClick={onRatingsClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-rating to-amber-500 text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all"
          >
            <Trophy className="h-4 w-4" />
            <span>Рейтинги</span>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            {/* Bonus Account mini */}
            <button
              onClick={() => navigate("/bonus-account")}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition-all"
              aria-label="Бонусний рахунок"
            >
              <Wallet className="h-4.5 w-4.5" />
            </button>
            {/* Promos mini */}
            <button
              onClick={onPromoClick}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-live hover:bg-live/10 active:scale-95 transition-all"
              aria-label="Акції"
            >
              <Gift className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={onSearchClick}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={onFavoritesClick}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
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
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
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
      <AppRatingModal isOpen={isRatingOpen} onClose={() => setIsRatingOpen(false)} type="app" />
    </>
  );
};
