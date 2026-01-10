import { ShoppingCart, Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">T</span>
          </div>
          <span className="font-bold text-lg text-foreground">Taverna</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSearchClick}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            onClick={onNotificationsClick}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Bell className="h-5 w-5" />
          </button>

          <button
            onClick={onCartClick}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className={cn(
                "absolute -top-0.5 -right-0.5",
                "min-w-[18px] h-[18px] px-1",
                "flex items-center justify-center",
                "bg-live text-live-foreground",
                "text-[10px] font-bold rounded-full"
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
