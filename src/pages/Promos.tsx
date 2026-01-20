import { useState } from "react";
import { Gift, Percent, Zap, Clock, ChevronRight, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromoCard } from "@/components/PromoCard";

interface Promo {
  id: string;
  title: string;
  description: string;
  type: "discount" | "referral" | "flash" | "bonus";
  code?: string;
  discountPercent?: number;
  validUntil?: Date;
  isActive: boolean;
}

// Mock data for promos - will be managed by admin
const mockPromos: Promo[] = [
  {
    id: "1",
    title: "Знижка 15% на тактичне взуття",
    description: "Використай промокод при оформленні замовлення",
    type: "discount",
    code: "BOOTS15",
    discountPercent: 15,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    id: "2",
    title: "Flash Sale: -30% на рюкзаки",
    description: "Тільки сьогодні! Обмежена кількість",
    type: "flash",
    discountPercent: 30,
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    id: "3",
    title: "Бонус за перше замовлення",
    description: "Отримай 100 грн на бонусний рахунок",
    type: "bonus",
    isActive: true,
  },
  {
    id: "4",
    title: "Приведи друга - отримай 200 грн",
    description: "За кожного запрошеного друга, який зробить замовлення",
    type: "referral",
    isActive: true,
  },
];

export const Promos = () => {
  const [activeFilter, setActiveFilter] = useState<"all" | "discount" | "flash" | "bonus">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredPromos = mockPromos.filter(promo => {
    if (activeFilter === "all") return promo.isActive;
    return promo.type === activeFilter && promo.isActive;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filters = [
    { id: "all", label: "Всі", icon: Gift },
    { id: "discount", label: "Знижки", icon: Percent },
    { id: "flash", label: "Flash", icon: Zap },
    { id: "bonus", label: "Бонуси", icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-primary via-primary/80 to-accent p-6 pt-4">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-10 mix-blend-overlay" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center">
              <Gift className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Акції та Знижки</h1>
              <p className="text-sm text-primary-foreground/80">Спеціальні пропозиції для вас</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-background/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-primary-foreground">{mockPromos.length}</span>
              <p className="text-xs text-primary-foreground/70">Активних акцій</p>
            </div>
            <div className="bg-background/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-primary-foreground">30%</span>
              <p className="text-xs text-primary-foreground/70">Макс. знижка</p>
            </div>
            <div className="bg-background/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-primary-foreground">∞</span>
              <p className="text-xs text-primary-foreground/70">Бонуси</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as typeof activeFilter)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Promos List */}
      <div className="px-4 space-y-4">
        {filteredPromos.map((promo) => (
          <div
            key={promo.id}
            className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
          >
            <PromoCard
              title={promo.title}
              description={promo.description}
              type={promo.type}
              validUntil={promo.validUntil}
            />
            
            {/* Promo Code Section */}
            {promo.code && (
              <div className="px-4 pb-4 -mt-2">
                <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="font-mono font-bold text-foreground">{promo.code}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(promo.code!)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      copiedCode === promo.code
                        ? "bg-success text-success-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {copiedCode === promo.code ? "Скопійовано!" : "Копіювати"}
                  </button>
                </div>
              </div>
            )}

            {/* Timer for flash sales */}
            {promo.type === "flash" && promo.validUntil && (
              <div className="px-4 pb-4 -mt-2">
                <div className="flex items-center gap-2 text-warning">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Залишилось: {Math.ceil((promo.validUntil.getTime() - Date.now()) / (1000 * 60 * 60))} год
                  </span>
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="px-4 pb-4">
              <button className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary py-3 rounded-xl font-medium hover:bg-primary/20 transition-colors">
                Перейти до товарів
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredPromos.length === 0 && (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Немає активних акцій у цій категорії</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Promos;
