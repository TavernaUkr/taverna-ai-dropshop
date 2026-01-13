import { ShoppingCart, Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import tavernaLogo from "@/assets/taverna-logo.png";

interface HeaderProps {
  cartCount?: number;
  onCartClick?: () => void;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
}

export const Header = ({
  cartCount = 0,
  onCartClick,
  onSearchClick,
  onNotificationsClick,
}: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-[72px] px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img 
            src={tavernaLogo} 
            alt="Taverna Group" 
            className="w-12 h-12 rounded-xl object-cover shadow-md"
          />
          <div className="flex flex-col">
            <span className="font-bold text-base text-foreground leading-tight">Taverna</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Group</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSearchClick}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            onClick={onNotificationsClick}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <Bell className="h-5 w-5" />
          </button>

          <button
            onClick={onCartClick}
            className="relative w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className={cn(
                "absolute -top-0.5 -right-0.5",
                "min-w-[22px] h-[22px] px-1.5",
                "flex items-center justify-center",
                "bg-live text-live-foreground",
                "text-[11px] font-bold rounded-full shadow-md"
              )}>
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
