import { useState, useEffect } from "react";
import { Star, Trophy, TrendingUp, Users, ShoppingBag, Package, BarChart3, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type Period = "day" | "month" | "year";

interface CustomerRatingItem {
  rank: number;
  name: string;
  ordersCount: number;
  totalSpent: number;
  productsCount: number;
}

interface SupplierRatingItem {
  rank: number;
  shopName: string;
  soldCount: number;
  revenue: number;
  customersCount: number;
  avgRating: number;
}

interface ShopReview {
  shopName: string;
  avgRating: number;
  reviewsCount: number;
  logo?: string;
}

// Mock data generators
const generateCustomerRatings = (period: Period): CustomerRatingItem[] => {
  const multiplier = period === "day" ? 1 : period === "month" ? 30 : 365;
  return [
    { rank: 1, name: "Олекс***", ordersCount: 12 * multiplier / 30, totalSpent: 24500 * multiplier / 30, productsCount: 35 * multiplier / 30 },
    { rank: 2, name: "Мар***", ordersCount: 9 * multiplier / 30, totalSpent: 18200 * multiplier / 30, productsCount: 27 * multiplier / 30 },
    { rank: 3, name: "Дмит***", ordersCount: 7 * multiplier / 30, totalSpent: 14800 * multiplier / 30, productsCount: 21 * multiplier / 30 },
    { rank: 4, name: "Ірин***", ordersCount: 6 * multiplier / 30, totalSpent: 12100 * multiplier / 30, productsCount: 18 * multiplier / 30 },
    { rank: 5, name: "Серг***", ordersCount: 5 * multiplier / 30, totalSpent: 9800 * multiplier / 30, productsCount: 15 * multiplier / 30 },
    { rank: 6, name: "Анн***", ordersCount: 4 * multiplier / 30, totalSpent: 8200 * multiplier / 30, productsCount: 12 * multiplier / 30 },
    { rank: 7, name: "Вол***", ordersCount: 4 * multiplier / 30, totalSpent: 7500 * multiplier / 30, productsCount: 11 * multiplier / 30 },
    { rank: 8, name: "Нат***", ordersCount: 3 * multiplier / 30, totalSpent: 6100 * multiplier / 30, productsCount: 9 * multiplier / 30 },
  ].map(item => ({
    ...item,
    ordersCount: Math.max(1, Math.round(item.ordersCount)),
    totalSpent: Math.round(item.totalSpent),
    productsCount: Math.max(1, Math.round(item.productsCount)),
  }));
};

const generateSupplierRatings = (period: Period): SupplierRatingItem[] => {
  const multiplier = period === "day" ? 1 : period === "month" ? 30 : 365;
  return [
    { rank: 1, shopName: "Tactical Pro", soldCount: 145 * multiplier / 30, revenue: 289000 * multiplier / 30, customersCount: 89 * multiplier / 30, avgRating: 4.8 },
    { rank: 2, shopName: "Military Store", soldCount: 112 * multiplier / 30, revenue: 224000 * multiplier / 30, customersCount: 71 * multiplier / 30, avgRating: 4.7 },
    { rank: 3, shopName: "Urban Gear", soldCount: 98 * multiplier / 30, revenue: 196000 * multiplier / 30, customersCount: 64 * multiplier / 30, avgRating: 4.6 },
    { rank: 4, shopName: "Alpha Gear", soldCount: 76 * multiplier / 30, revenue: 152000 * multiplier / 30, customersCount: 49 * multiplier / 30, avgRating: 4.5 },
    { rank: 5, shopName: "Ranger Shop", soldCount: 61 * multiplier / 30, revenue: 122000 * multiplier / 30, customersCount: 41 * multiplier / 30, avgRating: 4.4 },
  ].map(item => ({
    ...item,
    soldCount: Math.max(1, Math.round(item.soldCount)),
    revenue: Math.round(item.revenue),
    customersCount: Math.max(1, Math.round(item.customersCount)),
  }));
};

const shopReviews: ShopReview[] = [
  { shopName: "Tactical Pro", avgRating: 4.8, reviewsCount: 234 },
  { shopName: "Military Store", avgRating: 4.7, reviewsCount: 189 },
  { shopName: "Urban Gear", avgRating: 4.6, reviewsCount: 156 },
  { shopName: "Alpha Gear", avgRating: 4.5, reviewsCount: 112 },
  { shopName: "Ranger Shop", avgRating: 4.4, reviewsCount: 89 },
  { shopName: "Spec Ops Gear", avgRating: 4.3, reviewsCount: 67 },
  { shopName: "Combat Ready", avgRating: 4.2, reviewsCount: 45 },
];

const periodLabels: Record<Period, string> = {
  day: "День",
  month: "Місяць",
  year: "Рік",
};

const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
const rankBgs = ["bg-yellow-500/10", "bg-slate-400/10", "bg-amber-600/10"];

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            s <= Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground/30"
          )}
        />
      ))}
      <span className={cn("ml-1 font-medium", size === "sm" ? "text-xs" : "text-sm")}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
};

const PeriodSelector = ({ period, onChange }: { period: Period; onChange: (p: Period) => void }) => (
  <div className="flex gap-1 bg-muted rounded-lg p-1">
    {(["day", "month", "year"] as Period[]).map((p) => (
      <button
        key={p}
        onClick={() => onChange(p)}
        className={cn(
          "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all",
          period === p
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {periodLabels[p]}
      </button>
    ))}
  </div>
);

// Customer Rankings Tab
const CustomerRankings = () => {
  const [period, setPeriod] = useState<Period>("month");
  const [sortBy, setSortBy] = useState<"spent" | "orders" | "products">("spent");
  const customers = generateCustomerRatings(period);

  const sorted = [...customers].sort((a, b) => {
    if (sortBy === "spent") return b.totalSpent - a.totalSpent;
    if (sortBy === "orders") return b.ordersCount - a.ordersCount;
    return b.productsCount - a.productsCount;
  }).map((c, i) => ({ ...c, rank: i + 1 }));

  return (
    <div className="space-y-3">
      <PeriodSelector period={period} onChange={setPeriod} />

      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {(["spent", "orders", "products"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={cn(
              "flex-1 text-[10px] font-medium py-1.5 px-1 rounded-md transition-all",
              sortBy === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {s === "spent" ? "Сума" : s === "orders" ? "Замовлення" : "Товари"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((customer) => (
          <div
            key={customer.rank}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border border-border bg-card",
              customer.rank <= 3 && rankBgs[customer.rank - 1]
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
              customer.rank <= 3 ? rankBgs[customer.rank - 1] : "bg-muted",
              customer.rank <= 3 ? rankColors[customer.rank - 1] : "text-muted-foreground"
            )}>
              {customer.rank <= 3 ? <Trophy className="h-4 w-4" /> : customer.rank}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">{customer.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <ShoppingBag className="h-3 w-3" /> {customer.ordersCount} зам.
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Package className="h-3 w-3" /> {customer.productsCount} тов.
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-primary">{customer.totalSpent.toLocaleString()} ₴</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Supplier Rankings Tab (only visible to suppliers/admins)
const SupplierRankings = ({ canView }: { canView: boolean }) => {
  const [period, setPeriod] = useState<Period>("month");

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground">Доступно для постачальників</p>
        <p className="text-sm text-muted-foreground max-w-48">
          Статистика постачальників видима лише для верифікованих партнерів
        </p>
      </div>
    );
  }

  const suppliers = generateSupplierRatings(period);

  return (
    <div className="space-y-3">
      <PeriodSelector period={period} onChange={setPeriod} />

      <div className="space-y-2">
        {suppliers.map((supplier) => (
          <div
            key={supplier.rank}
            className={cn(
              "p-3 rounded-xl border border-border bg-card",
              supplier.rank <= 3 && rankBgs[supplier.rank - 1]
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                supplier.rank <= 3 ? rankBgs[supplier.rank - 1] : "bg-muted",
                supplier.rank <= 3 ? rankColors[supplier.rank - 1] : "text-muted-foreground"
              )}>
                {supplier.rank <= 3 ? <Trophy className="h-4 w-4" /> : supplier.rank}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">{supplier.shopName}</p>
                <StarRating rating={supplier.avgRating} />
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{supplier.revenue.toLocaleString()} ₴</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-muted/60 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Продано</p>
                <p className="text-sm font-bold text-foreground">{supplier.soldCount}</p>
              </div>
              <div className="bg-muted/60 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Клієнтів</p>
                <p className="text-sm font-bold text-foreground">{supplier.customersCount}</p>
              </div>
              <div className="bg-muted/60 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Рейтинг</p>
                <p className="text-sm font-bold text-foreground">{supplier.avgRating}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Shop Reviews Tab (public)
const ShopReviews = () => {
  const [shopRatings, setShopRatings] = useState<ShopReview[]>(shopReviews);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const { data } = await supabase
          .from('app_ratings')
          .select('target_id, rating, comment')
          .eq('rating_type', 'shop');

        if (data && data.length > 0) {
          // Group by target_id and calculate averages
          const grouped = data.reduce((acc: Record<string, { total: number; count: number }>, r) => {
            const key = r.target_id || 'unknown';
            if (!acc[key]) acc[key] = { total: 0, count: 0 };
            acc[key].total += r.rating;
            acc[key].count += 1;
            return acc;
          }, {});

          // Fetch supplier names
          const supplierIds = Object.keys(grouped);
          if (supplierIds.length > 0) {
            const { data: suppliers } = await supabase
              .from('suppliers')
              .select('id, shop_name, logo_url')
              .in('id', supplierIds);

            if (suppliers) {
              const realRatings = suppliers.map(s => ({
                shopName: s.shop_name,
                avgRating: grouped[s.id] 
                  ? Math.round((grouped[s.id].total / grouped[s.id].count) * 10) / 10
                  : 5.0,
                reviewsCount: grouped[s.id]?.count || 0,
                logo: s.logo_url || undefined,
              })).sort((a, b) => b.avgRating - a.avgRating);

              if (realRatings.length > 0) {
                setShopRatings(realRatings);
              }
            }
          }
        }
      } catch {
        // fallback to mock data
      }
    };

    fetchRatings();
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Публічний рейтинг магазинів на основі відгуків клієнтів
      </p>
      <div className="space-y-2">
        {shopRatings.map((shop, index) => (
          <div key={shop.shopName} className={cn(
            "flex items-center gap-3 p-3 rounded-xl border border-border bg-card",
            index < 3 && rankBgs[index]
          )}>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm",
              index < 3 ? rankBgs[index] : "bg-muted",
              index < 3 ? rankColors[index] : "text-muted-foreground"
            )}>
              {index < 3 ? <Trophy className="h-5 w-5" /> : index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">{shop.shopName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={shop.avgRating} />
                <span className="text-xs text-muted-foreground">({shop.reviewsCount} відгуків)</span>
              </div>
            </div>
            {/* Rating bar */}
            <div className="w-16">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning rounded-full transition-all"
                  style={{ width: `${(shop.avgRating / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RatingsTab = () => {
  const { effectiveRole } = useTelegramAuthContext();
  const canViewSupplierStats = effectiveRole === "supplier" || effectiveRole === "admin" || effectiveRole === "moderator";

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-rating" />
        <h2 className="text-lg font-bold text-foreground">Рейтинги</h2>
        <div className="flex items-center gap-1 ml-1">
          <BarChart3 className="h-3.5 w-3.5 text-rating animate-pulse" />
          <span className="text-xs font-medium text-rating">LIVE</span>
        </div>
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="customers" className="text-xs">
            <Users className="h-3.5 w-3.5 mr-1" />
            Клієнти
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs">
            <TrendingUp className="h-3.5 w-3.5 mr-1" />
            Магазини
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs">
            <Star className="h-3.5 w-3.5 mr-1" />
            Відгуки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-3">
          <CustomerRankings />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-3">
          <SupplierRankings canView={canViewSupplierStats} />
        </TabsContent>

        <TabsContent value="reviews" className="mt-3">
          <ShopReviews />
        </TabsContent>
      </Tabs>
    </div>
  );
};
