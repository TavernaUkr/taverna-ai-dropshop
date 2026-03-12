import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Trophy, TrendingUp, Users, ShoppingBag, Package, BarChart3, Gift, Crown, Zap, Award, Wallet, MessageSquare, BadgeCheck, Info, ChevronDown, ChevronUp, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SupplierBadge, getSupplierBadge, getCustomerBadge, type SupplierBadgeInfo } from "@/components/ui/supplier-badge";

type Period = "week" | "month" | "year";

interface CustomerRatingItem {
  rank: number;
  name: string;
  ordersCount: number;
  totalSpent: number;
  productsCount: number;
  avgRating: number;
  ratingsCount: number;
  badge?: SupplierBadgeInfo;
}

interface SupplierRatingItem {
  rank: number;
  shopName: string;
  soldCount: number;
  revenue: number;
  customersCount: number;
  avgRating: number;
  reviewsCount: number;
  badge?: SupplierBadgeInfo;
}

interface ShopReview {
  shopName: string;
  avgRating: number;
  reviewsCount: number;
  logo?: string;
}

interface ProductReview {
  productName: string;
  avgRating: number;
  reviewsCount: number;
  image?: string;
}

const generateCustomerRatings = (period: Period): CustomerRatingItem[] => {
  const multiplier = period === "week" ? 7 : period === "month" ? 30 : 365;
  return [
    { rank: 1, name: "Олекс***", ordersCount: 12 * multiplier / 30, totalSpent: 24500 * multiplier / 30, productsCount: 35 * multiplier / 30 },
    { rank: 2, name: "Мар***", ordersCount: 9 * multiplier / 30, totalSpent: 18200 * multiplier / 30, productsCount: 27 * multiplier / 30 },
    { rank: 3, name: "Дмит***", ordersCount: 7 * multiplier / 30, totalSpent: 14800 * multiplier / 30, productsCount: 21 * multiplier / 30 },
    { rank: 4, name: "Ірин***", ordersCount: 6 * multiplier / 30, totalSpent: 12100 * multiplier / 30, productsCount: 18 * multiplier / 30 },
    { rank: 5, name: "Серг***", ordersCount: 5 * multiplier / 30, totalSpent: 9800 * multiplier / 30, productsCount: 15 * multiplier / 30 },
    { rank: 6, name: "Анн***", ordersCount: 4 * multiplier / 30, totalSpent: 8200 * multiplier / 30, productsCount: 12 * multiplier / 30 },
    { rank: 7, name: "Вол***", ordersCount: 4 * multiplier / 30, totalSpent: 7500 * multiplier / 30, productsCount: 11 * multiplier / 30 },
    { rank: 8, name: "Нат***", ordersCount: 3 * multiplier / 30, totalSpent: 6100 * multiplier / 30, productsCount: 9 * multiplier / 30 },
  ].map((item, idx) => ({
    ...item,
    ordersCount: Math.max(1, Math.round(item.ordersCount)),
    totalSpent: Math.round(item.totalSpent),
    productsCount: Math.max(1, Math.round(item.productsCount)),
    badge: getCustomerBadge(
      period === "year" ? idx + 1 : null,
      period === "month" ? idx + 1 : null,
      period === "week" ? idx + 1 : null,
    ),
  }));
};

const generateSupplierRatings = (period: Period): SupplierRatingItem[] => {
  const multiplier = period === "week" ? 7 : period === "month" ? 30 : 365;
  return [
    { rank: 1, shopName: "Tactical Pro", soldCount: 145 * multiplier / 30, revenue: 289000 * multiplier / 30, customersCount: 89 * multiplier / 30, avgRating: 4.8, reviewsCount: Math.round(34 * multiplier / 30) },
    { rank: 2, shopName: "Military Store", soldCount: 112 * multiplier / 30, revenue: 224000 * multiplier / 30, customersCount: 71 * multiplier / 30, avgRating: 4.7, reviewsCount: Math.round(28 * multiplier / 30) },
    { rank: 3, shopName: "Urban Gear", soldCount: 98 * multiplier / 30, revenue: 196000 * multiplier / 30, customersCount: 64 * multiplier / 30, avgRating: 4.6, reviewsCount: Math.round(22 * multiplier / 30) },
    { rank: 4, shopName: "Alpha Gear", soldCount: 76 * multiplier / 30, revenue: 152000 * multiplier / 30, customersCount: 49 * multiplier / 30, avgRating: 4.5, reviewsCount: Math.round(16 * multiplier / 30) },
    { rank: 5, shopName: "Ranger Shop", soldCount: 61 * multiplier / 30, revenue: 122000 * multiplier / 30, customersCount: 41 * multiplier / 30, avgRating: 4.4, reviewsCount: Math.round(11 * multiplier / 30) },
  ].map((item, idx) => ({
    ...item,
    soldCount: Math.max(1, Math.round(item.soldCount)),
    revenue: Math.round(item.revenue),
    customersCount: Math.max(1, Math.round(item.customersCount)),
    reviewsCount: Math.max(0, item.reviewsCount),
    badge: getSupplierBadge(
      period === "year" ? idx + 1 : null,
      period === "month" ? idx + 1 : null,
      period === "week" ? idx + 1 : null,
    ),
  }));
};

const shopReviewsMock: ShopReview[] = [
  { shopName: "Tactical Pro", avgRating: 4.8, reviewsCount: 234 },
  { shopName: "Military Store", avgRating: 4.7, reviewsCount: 189 },
  { shopName: "Urban Gear", avgRating: 4.6, reviewsCount: 156 },
  { shopName: "Alpha Gear", avgRating: 4.5, reviewsCount: 112 },
  { shopName: "Ranger Shop", avgRating: 4.4, reviewsCount: 89 },
];

const periodLabels: Record<Period, string> = { week: "Тиждень", month: "Місяць", year: "Рік" };
const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
const rankBgs = ["bg-yellow-500/10", "bg-slate-400/10", "bg-amber-600/10"];

// Customer bonus amounts per period
const customerBonuses: Record<Period, { first: string; second: string; third: string }> = {
  week: { first: "+75₴", second: "+40₴", third: "+15₴" },
  month: { first: "+500₴", second: "+200₴", third: "+100₴" },
  year: { first: "🎁 1500₴", second: "+1000₴", third: "+500₴" },
};

// Supplier perks per period
const supplierPerks: Record<Period, { first: string; second: string; third: string }> = {
  week: { first: "Безк. пост", second: "Буст 7дн", third: "Пріоритет" },
  month: { first: "28% націнка", second: "Безк. пост", third: "Пріоритет" },
  year: { first: "25% на 3міс", second: "28% на 1міс", third: "Безк. реклама" },
};

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4", s <= Math.round(rating) ? "fill-warning text-warning" : "text-muted-foreground/30")} />
    ))}
    <span className={cn("ml-1 font-medium", size === "sm" ? "text-xs" : "text-sm")}>{rating.toFixed(1)}</span>
  </div>
);

const PeriodSelector = ({ period, onChange }: { period: Period; onChange: (p: Period) => void }) => (
  <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
    {(["week", "month", "year"] as Period[]).map((p) => (
      <button key={p} onClick={() => onChange(p)} className={cn("flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all", period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
        {periodLabels[p]}
      </button>
    ))}
  </div>
);

// Customer Rankings — unified single ranking
const CustomerRankings = () => {
  const [period, setPeriod] = useState<Period>("month");
  const customers = generateCustomerRatings(period);
  const bonuses = customerBonuses[period];

  return (
    <div className="space-y-3">
      <PeriodSelector period={period} onChange={setPeriod} />

      {/* Prize pool banner */}
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
        <Gift className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 flex items-center gap-3 text-[10px]">
          <span className="font-medium text-foreground">🥇 {bonuses.first}</span>
          <span className="text-muted-foreground">🥈 {bonuses.second}</span>
          <span className="text-muted-foreground">🥉 {bonuses.third}</span>
        </div>
      </div>

      <div className="space-y-2">
        {customers.map((customer) => (
          <div key={customer.rank} className={cn("p-3 rounded-xl border transition-all", customer.rank <= 3 ? `${rankBgs[customer.rank - 1]} border-transparent` : "border-border bg-card")}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0", customer.rank <= 3 ? rankBgs[customer.rank - 1] : "bg-muted", customer.rank <= 3 ? rankColors[customer.rank - 1] : "text-muted-foreground")}>
                {customer.rank <= 3 ? <Trophy className="h-4 w-4" /> : customer.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm text-foreground">{customer.name}</p>
                  {customer.badge && <SupplierBadge badge={{ ...customer.badge, ownerType: "customer" }} size="sm" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating rating={customer.avgRating} />
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MessageSquare className="h-2.5 w-2.5" /> {customer.ratingsCount}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{customer.totalSpent.toLocaleString()}₴</p>
                {customer.rank <= 3 && (
                  <Badge variant="outline" className="text-[8px] mt-0.5 border-primary/30 text-primary px-1.5">
                    {customer.rank === 1 ? bonuses.first : customer.rank === 2 ? bonuses.second : bonuses.third}
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-background/60 rounded-lg p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">Замовлень</p>
                <p className="text-xs font-bold text-foreground">{customer.ordersCount}</p>
              </div>
              <div className="bg-background/60 rounded-lg p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">Товарів</p>
                <p className="text-xs font-bold text-foreground">{customer.productsCount}</p>
              </div>
              <div className="bg-background/60 rounded-lg p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">Рейтинг</p>
                <p className="text-xs font-bold text-foreground">{customer.avgRating.toFixed(1)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Supplier Rankings (public)
const SupplierRankings = () => {
  const [period, setPeriod] = useState<Period>("month");

  const suppliers = generateSupplierRatings(period);
  const perks = supplierPerks[period];

  return (
    <div className="space-y-3">
      <PeriodSelector period={period} onChange={setPeriod} />

      {/* Prize pool banner */}
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/5 border border-accent/20">
        <Award className="h-4 w-4 text-accent-foreground shrink-0" />
        <div className="flex-1 flex items-center gap-3 text-[10px]">
          <span className="font-medium text-foreground">🥇 {perks.first}</span>
          <span className="text-muted-foreground">🥈 {perks.second}</span>
          <span className="text-muted-foreground">🥉 {perks.third}</span>
        </div>
      </div>

      <div className="space-y-2">
        {suppliers.map((supplier) => (
          <div key={supplier.rank} className={cn("p-3 rounded-xl border transition-all", supplier.rank <= 3 ? `${rankBgs[supplier.rank - 1]} border-transparent` : "border-border bg-card")}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0", supplier.rank <= 3 ? rankBgs[supplier.rank - 1] : "bg-muted", supplier.rank <= 3 ? rankColors[supplier.rank - 1] : "text-muted-foreground")}>
                {supplier.rank <= 3 ? <Trophy className="h-4 w-4" /> : supplier.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm text-foreground">{supplier.shopName}</p>
                  {supplier.badge && <SupplierBadge badge={supplier.badge} size="sm" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating rating={supplier.avgRating} />
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MessageSquare className="h-2.5 w-2.5" /> {supplier.reviewsCount}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{supplier.revenue.toLocaleString()}₴</p>
                {supplier.rank <= 3 && (
                  <Badge variant="outline" className="text-[8px] mt-0.5 border-primary/30 text-primary px-1.5">
                    {supplier.rank === 1 ? perks.first : supplier.rank === 2 ? perks.second : perks.third}
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-background/60 rounded-lg p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">Продано</p>
                <p className="text-xs font-bold text-foreground">{supplier.soldCount}</p>
              </div>
              <div className="bg-background/60 rounded-lg p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">Клієнтів</p>
                <p className="text-xs font-bold text-foreground">{supplier.customersCount}</p>
              </div>
              <div className="bg-background/60 rounded-lg p-1.5 text-center">
                <p className="text-[9px] text-muted-foreground">Рейтинг</p>
                <p className="text-xs font-bold text-foreground">{supplier.avgRating}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// All Reviews — Shop reviews + Product reviews combined
const AllReviews = () => {
  const [subTab, setSubTab] = useState<"shops" | "products">("shops");

  return (
    <div className="space-y-3">
      <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
        <button onClick={() => setSubTab("shops")} className={cn("flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all", subTab === "shops" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          🏪 Магазини
        </button>
        <button onClick={() => setSubTab("products")} className={cn("flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all", subTab === "products" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          📦 Товари
        </button>
      </div>
      {subTab === "shops" ? <ShopReviews /> : <ProductReviews />}
    </div>
  );
};

// Shop Reviews
const ShopReviews = () => {
  const [shopRatings, setShopRatings] = useState<ShopReview[]>(shopReviewsMock);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const { data } = await supabase.from('app_ratings').select('target_id, rating').eq('rating_type', 'shop');
        if (data && data.length > 0) {
          const grouped = data.reduce((acc: Record<string, { total: number; count: number }>, r) => {
            const key = r.target_id || 'unknown';
            if (!acc[key]) acc[key] = { total: 0, count: 0 };
            acc[key].total += r.rating;
            acc[key].count += 1;
            return acc;
          }, {});
          const supplierIds = Object.keys(grouped);
          if (supplierIds.length > 0) {
            const { data: suppliers } = await supabase.from('suppliers').select('id, shop_name, logo_url').in('id', supplierIds);
            if (suppliers && suppliers.length > 0) {
              const realRatings = suppliers.map(s => ({
                shopName: s.shop_name,
                avgRating: grouped[s.id] ? Math.round((grouped[s.id].total / grouped[s.id].count) * 10) / 10 : 5.0,
                reviewsCount: grouped[s.id]?.count || 0,
                logo: s.logo_url || undefined,
              })).sort((a, b) => b.avgRating - a.avgRating);
              setShopRatings(realRatings);
            }
          }
        }
      } catch { /* fallback to mock */ }
    };
    fetchRatings();
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Публічний рейтинг магазинів на основі відгуків клієнтів</p>
      <div className="space-y-2">
        {shopRatings.map((shop, index) => (
          <div key={shop.shopName} className={cn("flex items-center gap-3 p-3 rounded-xl border", index < 3 ? `${rankBgs[index]} border-transparent` : "border-border bg-card")}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm", index < 3 ? rankBgs[index] : "bg-muted", index < 3 ? rankColors[index] : "text-muted-foreground")}>
              {index < 3 ? <Trophy className="h-5 w-5" /> : index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">{shop.shopName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={shop.avgRating} />
                <span className="text-xs text-muted-foreground">({shop.reviewsCount})</span>
              </div>
            </div>
            <div className="w-16">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${(shop.avgRating / 5) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Product Reviews
const ProductReviews = () => {
  const [products, setProducts] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProductReviews = async () => {
      try {
        const { data: reviews } = await supabase.from('reviews').select('product_id, rating').limit(500);
        if (reviews && reviews.length > 0) {
          const grouped = reviews.reduce((acc: Record<string, { total: number; count: number }>, r) => {
            const key = r.product_id || 'unknown';
            if (!acc[key]) acc[key] = { total: 0, count: 0 };
            acc[key].total += r.rating;
            acc[key].count += 1;
            return acc;
          }, {});
          const productIds = Object.keys(grouped).filter(k => k !== 'unknown').slice(0, 20);
          if (productIds.length > 0) {
            const { data: prods } = await supabase.from('products').select('id, name, images').in('id', productIds);
            if (prods && prods.length > 0) {
              const mapped = prods.map(p => ({
                productName: p.name,
                avgRating: grouped[p.id] ? Math.round((grouped[p.id].total / grouped[p.id].count) * 10) / 10 : 5.0,
                reviewsCount: grouped[p.id]?.count || 0,
                image: p.images?.[0] || undefined,
              })).sort((a, b) => b.avgRating - a.avgRating || b.reviewsCount - a.reviewsCount);
              setProducts(mapped);
              setIsLoading(false);
              return;
            }
          }
        }
        setProducts([
          { productName: "Тактичний рюкзак 45L", avgRating: 4.9, reviewsCount: 67 },
          { productName: "Берці зимові", avgRating: 4.8, reviewsCount: 54 },
          { productName: "Тактичні рукавиці", avgRating: 4.7, reviewsCount: 41 },
          { productName: "Флісова кофта", avgRating: 4.6, reviewsCount: 38 },
          { productName: "Термобілизна комплект", avgRating: 4.5, reviewsCount: 29 },
        ]);
      } catch {
        setProducts([
          { productName: "Тактичний рюкзак 45L", avgRating: 4.9, reviewsCount: 67 },
          { productName: "Берці зимові", avgRating: 4.8, reviewsCount: 54 },
          { productName: "Тактичні рукавиці", avgRating: 4.7, reviewsCount: 41 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProductReviews();
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Рейтинг товарів на основі відгуків покупців</p>
      <div className="space-y-2">
        {products.map((product, index) => (
          <div key={product.productName + index} className={cn("flex items-center gap-3 p-3 rounded-xl border", index < 3 ? `${rankBgs[index]} border-transparent` : "border-border bg-card")}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm overflow-hidden", index < 3 ? rankBgs[index] : "bg-muted", index < 3 ? rankColors[index] : "text-muted-foreground")}>
              {product.image ? (
                <img src={product.image} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : index < 3 ? (
                <Trophy className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{product.productName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={product.avgRating} />
                <span className="text-xs text-muted-foreground">({product.reviewsCount})</span>
              </div>
            </div>
            <div className="w-16">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${(product.avgRating / 5) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BadgeRules = () => {
  const [isOpen, setIsOpen] = useState(false);

  const supplierTiers = [
    {
      emoji: "🥇",
      name: "Золота галочка",
      checkColor: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      rule: "Топ 1-3 місце у річному рейтингу",
      detail: "Найвища нагорода. Магазин потрапив до трійки лідерів за підсумками року.",
    },
    {
      emoji: "🥈",
      name: "Срібна галочка",
      checkColor: "text-slate-400",
      bgColor: "bg-slate-400/10",
      rule: "Топ 1-3 місце у місячному рейтингу",
      detail: "Магазин показав найкращі результати за попередній місяць.",
    },
    {
      emoji: "🥉",
      name: "Бронзова галочка",
      checkColor: "text-amber-600",
      bgColor: "bg-amber-600/10",
      rule: "Топ 1-3 місце у тижневому рейтингу",
      detail: "Магазин увійшов до трійки лідерів за попередній тиждень.",
    },
    {
      emoji: "✅",
      name: "Верифікований",
      checkColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      rule: "Топ 4-10 місце у будь-якому рейтингу",
      detail: "Магазин входить до десятки найкращих за тиждень, місяць або рік.",
    },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground flex-1 text-left">
          Правила галочок та штрафів
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3 animate-fade-in">
        {/* Supplier badges */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Галочки магазинів
          </p>
          <div className="space-y-2">
            {supplierTiers.map((tier) => (
              <div key={tier.name} className={cn("p-3 rounded-xl border border-transparent", tier.bgColor)}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("rounded-full p-0.5", tier.bgColor)}>
                    <BadgeCheck className={cn("h-4 w-4", tier.checkColor)} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{tier.name}</span>
                  {tier.emoji !== "✅" && (
                    <div className="flex items-center gap-0.5 ml-auto">
                      <Trophy className={cn("h-3.5 w-3.5", tier.checkColor)} />
                      <span className={cn("text-[10px] font-bold", tier.checkColor)}>1-3</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-foreground/80">{tier.rule}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{tier.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Customer badges */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" /> Галочки клієнтів
          </p>
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1.5">
            <p className="text-xs text-foreground">Клієнти отримують галочки за ту саму систему, що й магазини — за місцем у рейтингу покупців (за сумою замовлень):</p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 bg-yellow-500/10 rounded-lg px-2 py-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-foreground font-medium">Золота — Топ 1-3/рік</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-400/10 rounded-lg px-2 py-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-foreground font-medium">Срібна — Топ 1-3/міс</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-600/10 rounded-lg px-2 py-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-foreground font-medium">Бронзова — Топ 1-3/тижд</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 rounded-lg px-2 py-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-foreground font-medium">Зелена — Топ 4-10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Penalty/protection system */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" /> Штрафи та захист
          </p>
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
              <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" /> Штрафи для магазинів
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>• Підтверджена скарга → -0.2 до рейтингу</li>
                <li>• 3+ скарги/місяць → втрата галочки</li>
                <li>• 5+ скарг/місяць → зниження в рейтингу</li>
                <li>• 10+ скарг → тимчасове призупинення</li>
                <li>• Повернення з вини магазину → безкоштовна логістика (від 1500₴)</li>
              </ul>
            </div>
            <div className="p-3 rounded-xl bg-warning/5 border border-warning/10">
              <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-warning" /> Штрафи для клієнтів
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li>• 3+ необґрунтованих повернення/місяць → втрата галочки</li>
                <li>• Фейкові скарги → попередження, потім бан</li>
                <li>• Навмисне псування рейтингу → видалення відгуку модератором</li>
                <li>• Зловживання → зниження ліміту бонусів на 50%</li>
              </ul>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[11px] text-muted-foreground">
                ✅ <span className="font-medium text-foreground">Принцип:</span> клієнт завжди правий, але при зловживаннях — штрафні санкції для обох сторін.
              </p>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-[11px] text-muted-foreground">
            💡 Поряд із галочкою відображається <Trophy className="h-3 w-3 inline text-yellow-500" /> кубок з номером місця (1, 2 або 3) у відповідному кольорі. Учасники без рейтингу в Топ-10 не отримують галочку.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const RatingsTab = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-rating" />
          <h2 className="text-lg font-bold text-foreground">Рейтинги</h2>
          <div className="flex items-center gap-1 ml-1">
            <BarChart3 className="h-3.5 w-3.5 text-rating animate-pulse" />
            <span className="text-xs font-medium text-rating">LIVE</span>
          </div>
        </div>
        <button
          onClick={() => navigate("/bonus-account")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 active:scale-95 transition-all"
        >
          <Wallet className="h-3.5 w-3.5" />
          Бонуси
        </button>
      </div>

      {/* Badge rules */}
      <BadgeRules />

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="customers" className="text-[10px] px-1">
            <Users className="h-3 w-3 mr-0.5" />
            Клієнти
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="text-[10px] px-1">
            <TrendingUp className="h-3 w-3 mr-0.5" />
            Продавці
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-[10px] px-1">
            <Star className="h-3 w-3 mr-0.5" />
            Всі відгуки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-3">
          <CustomerRankings />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-3">
          <SupplierRankings />
        </TabsContent>
        <TabsContent value="reviews" className="mt-3">
          <AllReviews />
        </TabsContent>
      </Tabs>
    </div>
  );
};
