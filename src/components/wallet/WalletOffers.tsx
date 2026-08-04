import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Users, Trophy, Gift, ChevronRight, Percent, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hapticSelection } from "@/lib/haptics";

interface OfferRow {
  icon: any;
  title: string;
  subtitle: string;
  badge?: string;
  to: string;
  tone: string;
}

/** Пропозиції, акції, промокоди і правила бонусів — в одному місці рахунку. */
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

  const rows: OfferRow[] = [
    {
      icon: Tag, title: "Промокоди та знижки",
      subtitle: "Активні пропозиції на замовлення",
      badge: promoCount > 0 ? String(promoCount) : undefined,
      to: "/promos", tone: "text-live",
    },
    {
      icon: Gift, title: "Мої бонуси",
      subtitle: `Доступно ${bonusBalance.toLocaleString("uk-UA")} бонусів`,
      to: "/personal-bonuses", tone: "text-rating",
    },
    {
      icon: Users, title: "Реферальна програма",
      subtitle: "Запрошуй друзів — отримуй бонуси",
      to: "/referrals", tone: "text-primary",
    },
    {
      icon: Trophy, title: "Рейтинги та нагороди",
      subtitle: "Множники бонусів за відгуки",
      to: "/?tab=ratings", tone: "text-warning",
    },
  ];

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" /> Пропозиції та бонуси
      </h2>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
        <Percent className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Бонусами можна оплатити до <span className="font-semibold text-foreground">7%</span> вартості
          кошика. Решта списується з реальних коштів рахунку — в один тап при оформленні.
        </p>
      </div>

      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
        {rows.map((r) => (
          <button
            key={r.title}
            onClick={() => { hapticSelection(); navigate(r.to); }}
            className="w-full flex items-center gap-3 p-3 bg-card text-left active:bg-muted/50"
          >
            <r.icon className={`h-4.5 w-4.5 ${r.tone}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{r.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{r.subtitle}</p>
            </div>
            {r.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-live/15 text-live">
                {r.badge}
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
