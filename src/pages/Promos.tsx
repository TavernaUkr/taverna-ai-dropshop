import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, Percent, Zap, Clock, ChevronRight, Tag, ArrowLeft, ChevronLeft, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { hapticImpact, hapticNotification } from "@/lib/haptics";

interface Promo {
  id: string;
  title: string;
  description: string;
  type: "discount" | "referral" | "flash" | "bonus";
  code?: string;
  discountPercent?: number;
  validUntil?: Date;
  isActive: boolean;
  categoryFilter?: string; // Optional category filter for the promo
}

// Promo storage key
const PROMO_STORAGE_KEY = "taverna_active_promo";

// Mock data for promos - only actual promo codes/discounts (no referral/bonus duplicates)
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
    categoryFilter: "Взуття",
  },
  {
    id: "2",
    title: "Flash Sale: -30% на рюкзаки",
    description: "Тільки сьогодні! Обмежена кількість",
    type: "flash",
    code: "FLASH30",
    discountPercent: 30,
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    id: "5",
    title: "-10% на всі рукавиці",
    description: "Тактичні рукавиці зі знижкою",
    type: "discount",
    code: "GLOVES10",
    discountPercent: 10,
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    isActive: true,
    categoryFilter: "Рукавиці",
  },
];

const promoConfig = {
  discount: {
    icon: Gift,
    gradient: "from-live to-warning",
    bgLight: "bg-live/10",
    textColor: "text-live",
  },
  referral: {
    icon: Gift,
    gradient: "from-primary to-accent",
    bgLight: "bg-primary/10",
    textColor: "text-primary",
  },
  flash: {
    icon: Zap,
    gradient: "from-warning to-amber-400",
    bgLight: "bg-warning/10",
    textColor: "text-warning",
  },
  bonus: {
    icon: Gift,
    gradient: "from-success to-emerald-400",
    bgLight: "bg-success/10",
    textColor: "text-success",
  },
};

export const Promos = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<"all" | "discount" | "flash" | "bonus">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredPromos = mockPromos.filter(promo => {
    if (activeFilter === "all") return promo.isActive;
    return promo.type === activeFilter && promo.isActive;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    hapticImpact("light");
    toast.success("Промокод скопійовано!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleApplyPromo = (promo: Promo) => {
    if (promo.code && promo.discountPercent) {
      // Save promo to localStorage for automatic application at checkout
      const promoData = {
        code: promo.code,
        discountPercent: promo.discountPercent,
        title: promo.title,
      };
      localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(promoData));
      
      hapticNotification("success");
      toast.success(`Промокод ${promo.code} буде застосовано при оформленні!`, {
        description: "Перейдіть до товарів та зробіть замовлення",
      });
    }
    
    // Navigate to products (optionally with category filter)
    if (promo.categoryFilter) {
      navigate(`/search?category=${encodeURIComponent(promo.categoryFilter)}`);
    } else {
      navigate("/search?all=true");
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  const filters = [
    { id: "all", label: "Всі", icon: Gift },
    { id: "discount", label: "Знижки", icon: Percent },
    { id: "flash", label: "Flash", icon: Zap },
    { id: "bonus", label: "Бонуси", icon: Tag },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-40 bg-gradient-to-br from-primary via-primary/90 to-accent">
        {/* Back button row */}
        <div className="flex items-center px-4 pt-3 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-primary-foreground hover:bg-primary-foreground/10 -ml-2"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Назад
          </Button>
        </div>

        {/* Hero content */}
        <div className="px-4 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
              <Gift className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Акції та Знижки</h1>
              <p className="text-sm text-primary-foreground/80">Спеціальні пропозиції для вас</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary-foreground/15 backdrop-blur-sm rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-primary-foreground">{mockPromos.length}</span>
              <p className="text-xs text-primary-foreground/70">Активних</p>
            </div>
            <div className="bg-primary-foreground/15 backdrop-blur-sm rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-primary-foreground">30%</span>
              <p className="text-xs text-primary-foreground/70">Макс.</p>
            </div>
            <div className="bg-primary-foreground/15 backdrop-blur-sm rounded-xl p-3 text-center">
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
        {filteredPromos.map((promo) => {
          const config = promoConfig[promo.type];
          const Icon = config.icon;

          return (
            <div
              key={promo.id}
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
            >
              {/* Promo Header */}
              <div className={cn("p-4", `bg-gradient-to-br ${config.gradient}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  
                  {promo.validUntil && (
                    <div className="flex items-center gap-1 text-xs bg-primary-foreground/20 backdrop-blur-sm px-2 py-1 rounded-full text-primary-foreground">
                      <Clock className="h-3 w-3" />
                      <span>до {formatDate(promo.validUntil)}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3">
                  <h3 className="font-bold text-lg text-primary-foreground leading-tight">{promo.title}</h3>
                  <p className="text-sm text-primary-foreground/80 mt-1">{promo.description}</p>
                </div>

                {promo.discountPercent && (
                  <div className="mt-3 inline-flex items-center gap-1 bg-primary-foreground/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <Percent className="h-4 w-4 text-primary-foreground" />
                    <span className="font-bold text-primary-foreground">-{promo.discountPercent}%</span>
                  </div>
                )}
              </div>
              
              {/* Promo Code Section */}
              {promo.code && (
                <div className="p-4 border-t border-border">
                  <div className="flex items-center justify-between bg-muted rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="font-mono font-bold text-foreground text-sm">{promo.code}</span>
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
                <div className="px-4 pb-3">
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
                <button 
                  onClick={() => handleApplyPromo(promo)}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-md"
                >
                  {promo.code ? "Застосувати та перейти до товарів" : "Перейти до товарів"}
                  <ChevronRight className="w-4 h-4" />
                </button>
                {promo.code && (
                  <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
                    <Info className="w-3 h-3" />
                    Промокод буде застосовано автоматично
                  </p>
                )}
              </div>
            </div>
          );
        })}

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
