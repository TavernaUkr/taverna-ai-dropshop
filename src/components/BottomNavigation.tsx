import { Store, Users, Radio, HelpCircle, User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isCenter?: boolean;
  isLive?: boolean;
  isRating?: boolean;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const navItems: NavItem[] = [
  { id: "catalog", label: "Каталог", icon: <Store className="h-5 w-5" /> },
  { id: "suppliers", label: "Продавці", icon: <Users className="h-5 w-5" /> },
  { id: "live", label: "Live", icon: <Radio className="h-5 w-5" />, isCenter: true, isLive: true },
  { id: "ratings", label: "Рейтинги", icon: <Trophy className="h-5 w-5" />, isRating: true },
  { id: "support", label: "Підтримка", icon: <HelpCircle className="h-5 w-5" /> },
  { id: "account", label: "Профіль", icon: <User className="h-5 w-5" /> },
];

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="flex items-end justify-around h-[80px] pb-3 safe-area-pb">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative -top-3 flex flex-col items-center gap-0.5 group"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
                    isActive
                      ? "bg-live text-live-foreground scale-110"
                      : "bg-live/80 text-live-foreground group-hover:scale-105"
                  )}
                >
                  {item.icon}
                  {item.isLive && (
                    <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-live-foreground rounded-full animate-pulse-live" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-live" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          if (item.isRating) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative -top-3 flex flex-col items-center gap-0.5 group"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
                    isActive
                      ? "bg-rating text-rating-foreground scale-110"
                      : "bg-rating/80 text-rating-foreground group-hover:scale-105"
                  )}
                >
                  {item.icon}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-rating" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isActive && "bg-primary/10"
              )}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
