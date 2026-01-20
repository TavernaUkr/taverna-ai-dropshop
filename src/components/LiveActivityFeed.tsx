import { useEffect, useState } from "react";
import { 
  Package, UserPlus, Sparkles, TrendingUp, Truck, 
  RefreshCw, ShoppingCart, MessageSquare 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityItem {
  id: string;
  type: "order" | "supplier" | "product" | "ai" | "delivery" | "review" | "registration";
  message: string;
  timestamp: Date;
  meta?: {
    name?: string;
    amount?: number;
    count?: number;
  };
}

const activityIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  order: { icon: ShoppingCart, color: "text-success", bg: "bg-success/10" },
  supplier: { icon: Package, color: "text-primary", bg: "bg-primary/10" },
  product: { icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
  ai: { icon: Sparkles, color: "text-warning", bg: "bg-warning/10" },
  delivery: { icon: Truck, color: "text-blue-500", bg: "bg-blue-500/10" },
  review: { icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-500/10" },
  registration: { icon: UserPlus, color: "text-pink-500", bg: "bg-pink-500/10" },
};

// Mock data generator
const generateMockActivity = (): ActivityItem => {
  const types: ActivityItem["type"][] = ["order", "supplier", "product", "ai", "delivery", "review", "registration"];
  const type = types[Math.floor(Math.random() * types.length)];
  
  const messages: Record<string, string[]> = {
    order: [
      "Користувач {name} оплатив замовлення на {amount}₴",
      "Нове замовлення #{count} через Telegram Wallet",
      "Замовлення відправлено клієнту {name}",
    ],
    supplier: [
      "Постачальник {name} додав {count} товарів",
      "Новий постачальник подав заявку на реєстрацію",
      "Каталог {name} синхронізовано ({count} позицій)",
    ],
    product: [
      "Товар '{name}' став бестселером",
      "Оновлено ціни на {count} товарів",
      "Новий товар додано в категорію Military",
    ],
    ai: [
      "Gemini закінчив аналіз категорії {name}",
      "AI згенерував описи для {count} товарів",
      "Автокатегоризація завершена: {count} товарів",
    ],
    delivery: [
      "Посилка {name} доставлена у відділення",
      "Оновлено статус {count} відправлень",
      "Нова Пошта: посилку отримано",
    ],
    review: [
      "Користувач {name} залишив відгук ⭐⭐⭐⭐⭐",
      "Новий відгук з фото на товар",
      "Відповідь на відгук від постачальника",
    ],
    registration: [
      "Новий користувач {name} зареєструвався",
      "Реферальне запрошення від {name}",
      "{count} нових користувачів за годину",
    ],
  };

  const names = ["Олександр", "Марія", "Дмитро", "Анна", "Іван", "Tactical Pro", "Military Store", "Urban Gear"];
  const message = messages[type][Math.floor(Math.random() * messages[type].length)]
    .replace("{name}", names[Math.floor(Math.random() * names.length)])
    .replace("{amount}", String(Math.floor(Math.random() * 5000) + 500))
    .replace("{count}", String(Math.floor(Math.random() * 50) + 1));

  return {
    id: Date.now().toString(),
    type,
    message,
    timestamp: new Date(),
  };
};

interface LiveActivityFeedProps {
  className?: string;
  maxItems?: number;
  autoRefresh?: boolean;
}

export const LiveActivityFeed = ({ 
  className, 
  maxItems = 10,
  autoRefresh = true 
}: LiveActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial load
  useEffect(() => {
    const initial = Array.from({ length: 5 }, () => generateMockActivity());
    setActivities(initial);
  }, []);

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const newActivity = generateMockActivity();
      setActivities((prev) => [newActivity, ...prev].slice(0, maxItems));
    }, 8000);

    return () => clearInterval(interval);
  }, [autoRefresh, maxItems]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const newActivity = generateMockActivity();
      setActivities((prev) => [newActivity, ...prev].slice(0, maxItems));
      setIsRefreshing(false);
    }, 500);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "щойно";
    if (diff < 3600) return `${Math.floor(diff / 60)} хв тому`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} год тому`;
    return date.toLocaleDateString("uk-UA");
  };

  return (
    <div className={cn("bg-card rounded-xl border border-border overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">Live Активність</h3>
          <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
        </div>
        <button
          onClick={handleRefresh}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            "transition-all",
            isRefreshing && "animate-spin"
          )}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Activity List */}
      <ScrollArea className="h-[300px]">
        <div className="p-2 space-y-1">
          {activities.map((activity, index) => {
            const { icon: Icon, color, bg } = activityIcons[activity.type];
            return (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors",
                  index === 0 && "animate-slide-up"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
