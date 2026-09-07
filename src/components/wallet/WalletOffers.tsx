import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Users, ChevronRight, Info, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { hapticSelection } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface OfferCard {
  icon: any;
  title: string;
  subtitle: string;
  badge?: string;
  to: string;
  gradient: string;
}

/** Пропозиції, акції та реферали — у вигляді преміальних карток гаманця. */
export function WalletOffers({ bonusBalance = 0 }: { bonusBalance?: number }) {
  const navigate = useNavigate();
  const [promoCount, setPromoCount] = useState(0);

  useEffect(() => {
    supabase
      .from("promo_codes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .then(({ count }) => setPromoCount(count || 0));
  }, []);

  const cards: OfferCard[] = [
    {
      icon: Tag,
      title: "Промокоди та знижки",
      subtitle: "Активні пропозиції на замовлення",
      badge: promoCount > 0 ? `${promoCount} активних` : undefined,
      to: "/promos",
      gradient: "from-live via-live/85 to-warning",
    },
    {
      icon: Users,
      title: "Реферальна програма",
      subtitle: "Запрошуй друзів — отримуй бонуси",
      to: "/referrals",
      gradient: "from-primary via-primary/85 to-accent",
    },
  ];

  return (
    <div className="space-y-2.5">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" /> Пропозиції та бонуси
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Як використовувати бонуси"
                className="text-muted-foreground active:opacity-60"
                onClick={(e) => e.preventDefault()}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
              Бонусами можна оплатити до 7% вартості кошика — решта оплачується карткою або Telegram Wallet.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h2>

      <div className="space-y-2.5">
        {cards.map((c) => (
          <button
            key={c.title}
            onClick={() => { hapticSelection(); navigate(c.to); }}
            className={cn(
              "w-full relative overflow-hidden rounded-2xl p-4 text-left text-primary-foreground",
              "bg-gradient-to-br", c.gradient,
              "shadow-lg active:scale-[0.985] transition-transform duration-150",
            )}
          >
            <div className="absolute -right-10 -bottom-12 w-36 h-36 rounded-full bg-primary-foreground/10" />
            <div className="absolute -left-6 -top-10 w-24 h-24 rounded-full bg-primary-foreground/10" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
                <c.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold leading-tight truncate">{c.title}</p>
                <p className="text-[11px] opacity-85 truncate">{c.subtitle}</p>
              </div>
              {c.badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-foreground/20 backdrop-blur-sm whitespace-nowrap">
                  {c.badge}
                </span>
              )}
              <ChevronRight className="h-4 w-4 opacity-80" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
