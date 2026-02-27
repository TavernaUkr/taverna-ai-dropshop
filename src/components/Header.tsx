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
       <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="relative flex items-center justify-between h-16 px-3">
          {/* Logo - Left */}
          <div className="flex items-center gap-2 z-10">
            <button onClick={() => setIsInfoOpen(true)} className="relative active:scale-95 transition-transform">
              <img 
                src={tavernaLogo} 
                alt="Taverna Group" 
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Info className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            </button>
            <div className="flex flex-col">
              <span className="font-brand text-base text-foreground leading-tight" style={{ letterSpacing: '0.06em' }}>Taverna</span>
              <span className="font-brand text-[11px] text-rating leading-none font-extrabold" style={{ letterSpacing: '0.2em' }}>GROUP</span>
            </div>
          </div>

          {/* Center - Ratings (absolutely centered like Live button) */}
          <button
            onClick={onRatingsClick}
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 active:scale-95 transition-all z-10"
          >
            <div className="w-11 h-11 -mt-1 rounded-full bg-rating flex items-center justify-center shadow-md shadow-rating/30">
              <Trophy className="h-5 w-5 text-rating-foreground" />
            </div>
            <span className="font-brand text-xs text-rating font-extrabold leading-tight" style={{ letterSpacing: '0.08em' }}>Рейтинги</span>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-0.5 z-10">
            <button
              onClick={() => navigate("/bonus-account")}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition-all"
              aria-label="Бонусний рахунок"
            >
              <Wallet className="h-4 w-4" />
            </button>
            <button
              onClick={onPromoClick}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-live hover:bg-live/10 active:scale-95 transition-all"
              aria-label="Акції"
            >
              <Gift className="h-4 w-4" />
            </button>
            <button
              onClick={onSearchClick}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              <Search className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={onFavoritesClick}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              <Heart className="h-4.5 w-4.5" />
              {favoritesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-live text-live-foreground text-[9px] font-bold rounded-full">
                  {favoritesCount > 99 ? "99+" : favoritesCount}
                </span>
              )}
            </button>
            <button
              onClick={onCartClick}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              <ShoppingCart className="h-4.5 w-4.5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-primary text-primary-foreground text-[9px] font-bold rounded-full">
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
