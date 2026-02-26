import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet, ChevronLeft, Users, Tag, ShoppingBag, ChevronRight,
  Sparkles, Copy, Check, Trophy, Star, Award, Crown, MessageSquare,
  TrendingUp, Zap, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { useBonuses } from "@/hooks/useBonuses";
import { hapticSelection, hapticNotification } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function BonusAccount() {
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useTelegramAuthContext();
  const { balance, totalEarned, totalSpent } = useBonuses();
  const [referralCode, setReferralCode] = useState("");
  const [invitedCount, setInvitedCount] = useState(0);
  const [activeBonusesCount, setActiveBonusesCount] = useState(0);
  const [activePromosCount, setActivePromosCount] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showRatingBonuses, setShowRatingBonuses] = useState(false);

  const handleBack = () => {
    hapticSelection();
    if (showRatingBonuses) {
      setShowRatingBonuses(false);
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    const loadSummary = async () => {
      if (!profile?.id) { setIsLoading(false); return; }
      try {
        const code = profile.referral_code || `TAV-${profile.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
        setReferralCode(code);

        const { count } = await supabase
          .from("profiles_safe" as any)
          .select("id", { count: "exact", head: true })
          .eq("referred_by", profile.id);
        setInvitedCount(count || 0);

        const { data: orders } = await supabase
          .from("orders")
          .select("id, total")
          .eq("profile_id", profile.id)
          .limit(50);

        const ordersCount = orders?.length || 0;
        setTotalOrders(ordersCount);
        let bonusCount = 2;
        const totalSpending = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        if (totalSpending > 5000) bonusCount++;
        if (ordersCount < 3) bonusCount++;
        if (ordersCount >= 10) bonusCount++;
        setActiveBonusesCount(bonusCount);

        const { count: promosCount } = await supabase
          .from("promo_codes")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true);
        setActivePromosCount(promosCount || 0);
      } catch (error) {
        console.error("Error loading bonus summary:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSummary();
  }, [profile?.id]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    hapticNotification("success");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center h-14 px-4">
            <button onClick={handleBack} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all mr-3">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-foreground">Бонусний рахунок</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold mb-1.5">Увійдіть для доступу</h2>
            <p className="text-sm text-muted-foreground mb-4">Авторизуйтесь через Telegram для перегляду бонусного рахунку</p>
            <Button onClick={() => navigate("/")} className="w-full">На головну</Button>
          </div>
        </div>
      </div>
    );
  }

  if (showRatingBonuses) {
    return <RatingBonusesPage onBack={handleBack} onGoToRatings={() => { hapticSelection(); navigate("/?tab=ratings"); }} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={handleBack} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all mr-3">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Бонусний рахунок</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero: Balance left + Stats right */}
        <div className="p-4">
          <div className="bg-primary rounded-xl p-4 text-primary-foreground">
            <div className="flex">
              {/* Left: Balance */}
              <div className="flex-1 border-r border-primary-foreground/20 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 opacity-80" />
                  <span className="text-xs opacity-80">Баланс</span>
                </div>
                <p className="text-3xl font-bold">{balance}₴</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-[10px] opacity-70">+{totalEarned}₴</span>
                  <span className="text-[10px] opacity-70">−{totalSpent}₴</span>
                </div>
              </div>

              {/* Right: Stats grid */}
              <div className="flex-1 pl-3">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-primary-foreground/10 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-sm font-bold">{invitedCount}</p>
                    <p className="text-[9px] opacity-70">Реферали</p>
                  </div>
                  <div className="bg-primary-foreground/10 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-sm font-bold">{activeBonusesCount}</p>
                    <p className="text-[9px] opacity-70">Бонуси</p>
                  </div>
                  <div className="bg-primary-foreground/10 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-sm font-bold">{activePromosCount}</p>
                    <p className="text-[9px] opacity-70">Акції</p>
                  </div>
                  <div className="bg-primary-foreground/10 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-sm font-bold">{totalOrders >= 10 ? "✓" : "—"}</p>
                    <p className="text-[9px] opacity-70">Рейтинг</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Referral code compact */}
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2 bg-muted rounded-xl p-2.5">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <span className="font-mono font-semibold text-primary text-sm tracking-wider flex-1">{referralCode}</span>
            <button onClick={handleCopyCode} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center active:scale-90 transition-transform">
              {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <div className="px-4 space-y-1.5 pb-4">
          {[
            { icon: Users, label: "Реферальна програма", sub: "50₴ за друга • прогресивні тіри", path: "/referrals" },
            { icon: Sparkles, label: "Персональні бонуси", sub: "Кешбек 3-5% • AI-пропозиції", path: "/personal-bonuses" },
            { icon: Tag, label: "Акції та промокоди", sub: `${activePromosCount} активних акцій`, path: "/promos" },
            { icon: Trophy, label: "Рейтингові бонуси", sub: "Призи за день, тиждень, місяць, рік", action: () => setShowRatingBonuses(true) },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={() => { hapticSelection(); item.action ? item.action() : navigate(item.path!); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/30 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-[13px] leading-tight">{item.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            </button>
          ))}

          {/* Usage limits */}
          <div className="bg-muted/50 rounded-xl p-3 mt-2">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              💡 <span className="font-medium">Ліміт:</span> 5% (до 10 замовлень), 8% (10+), 10% (25+), 12% (50+). Бонуси не конвертуються у гроші.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-2">
            <Button
              onClick={() => { hapticSelection(); navigate("/"); }}
              className="w-full gap-2"
              size="lg"
            >
              <ShoppingBag className="w-5 h-5" />
              Витратити бонуси
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Rating Bonuses Sub-page ─── */

function RatingBonusesPage({ onBack, onGoToRatings }: { onBack: () => void; onGoToRatings: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={onBack} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all mr-3">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Рейтингові бонуси</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
        {/* Intro */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Trophy className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Змагайтесь — отримуйте призи!</p>
                  <p className="text-xs text-muted-foreground">
                    Рейтинг оновлюється щодня. Призи нараховуються автоматично на початку нового періоду.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── MATH NOTE ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <div className="bg-muted/40 rounded-xl p-3 border border-border/30">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              📊 <span className="font-medium">Економіка:</span> Бонуси розраховано так, що загальна сума нагород не перевищує 1.5-2% від обороту платформи, що забезпечує стабільну прибутковість при збереженні привабливості для учасників.
            </p>
          </div>
        </motion.div>

        {/* ── CLIENTS SECTION ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Клієнти</h2>
            <span className="text-[10px] text-muted-foreground ml-auto">замовлення • сума • товари</span>
          </div>

          {/* Daily */}
          <Card className="mb-2 border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">Д</span>
                </div>
                <span className="text-xs font-medium text-foreground">Щоденний</span>
                <span className="text-[9px] text-muted-foreground ml-auto">оновлення о 00:00</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>🥇 <span className="text-foreground font-medium">Топ-1:</span> +2 персональних бонуси (наступний день)</p>
                <p>🥈 <span className="text-foreground font-medium">Топ 2-3:</span> +1 персональний бонус</p>
              </div>
            </CardContent>
          </Card>

          {/* Weekly */}
          <Card className="mb-2 border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">Т</span>
                </div>
                <span className="text-xs font-medium text-foreground">Тижневий</span>
                <span className="text-[9px] text-muted-foreground ml-auto">щопонеділка</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>🥇 <span className="text-foreground font-medium">Топ-1:</span> 75₴ бонусів</p>
                <p>🥈 <span className="text-foreground font-medium">Топ 2-3:</span> 40₴ бонусів</p>
                <p>🥉 <span className="text-foreground font-medium">Топ 4-10:</span> 15₴ бонусів</p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly */}
          <Card className="mb-2 border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">М</span>
                </div>
                <span className="text-xs font-medium text-foreground">Місячний</span>
                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium ml-auto">Головний</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>🥇 <span className="text-foreground font-medium">Топ-1:</span> 500₴ + безкоштовна доставка (1 міс)</p>
                <p>🥈 <span className="text-foreground font-medium">Топ 2-3:</span> 200₴ бонусів</p>
                <p>🥉 <span className="text-foreground font-medium">Топ 4-10:</span> 100₴ бонусів</p>
              </div>
            </CardContent>
          </Card>

          {/* Yearly */}
          <Card className="mb-2 border-rating/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-rating/10 flex items-center justify-center">
                  <Crown className="w-3 h-3 text-rating" />
                </div>
                <span className="text-xs font-medium text-foreground">Річний</span>
                <span className="text-[9px] bg-rating/10 text-rating px-1.5 py-0.5 rounded-full font-medium ml-auto">Гранд-приз</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>🏆 <span className="text-foreground font-medium">Топ-1:</span> Безкоштовне замовлення до 1500₴ + VIP</p>
                <p>🥇 <span className="text-foreground font-medium">Топ 2-3:</span> 1000₴ бонусів</p>
                <p>🥈 <span className="text-foreground font-medium">Топ 4-10:</span> 500₴ бонусів</p>
              </div>
            </CardContent>
          </Card>

          {/* Order milestones */}
          <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 mb-4">
            <p className="text-[11px] font-medium text-foreground mb-1">⭐ Бонуси за замовлення</p>
            <p className="text-[10px] text-muted-foreground">+25₴ за кожне 5-те замовлення • +50₴ за кожне 10-те • +15₴ за відгук з фото</p>
          </div>
        </motion.div>

        {/* ── SUPPLIERS SECTION ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-accent-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Постачальники</h2>
            <span className="text-[10px] text-muted-foreground ml-auto">продажі • рейтинг • відгуки</span>
          </div>

          {/* Daily */}
          <Card className="mb-2 border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-accent-foreground">Д</span>
                </div>
                <span className="text-xs font-medium text-foreground">Щоденний</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>🥇 <span className="text-foreground font-medium">Топ-1 магазин:</span> Буст 1 товару на 24 години</p>
                <p>🥇 <span className="text-foreground font-medium">Топ-1 товар:</span> Пріоритет у видачі на день</p>
              </div>
            </CardContent>
          </Card>

          {/* Weekly */}
          <Card className="mb-2 border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-accent-foreground">Т</span>
                </div>
                <span className="text-xs font-medium text-foreground">Тижневий</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>🥇 <span className="text-foreground font-medium">Топ-1 магазин:</span> Пріоритет у черзі + безкоштовний пост</p>
                <p>🥇 <span className="text-foreground font-medium">Топ-1 товар:</span> Буст товару на 7 днів</p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly */}
          <Card className="mb-2 border-accent/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-accent/15 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-accent-foreground">М</span>
                </div>
                <span className="text-xs font-medium text-foreground">Місячний</span>
                <span className="text-[9px] bg-accent/10 text-accent-foreground px-1.5 py-0.5 rounded-full font-medium ml-auto">Головний</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>🥇 <span className="text-foreground font-medium">Топ-1:</span> Знижена націнка 28% (замість 33%) на місяць</p>
                <p>🥈 <span className="text-foreground font-medium">Топ 2-3:</span> 1 безкоштовний рекламний пост</p>
                <p>🥉 <span className="text-foreground font-medium">Топ 4-10:</span> Пріоритет у черзі реклами</p>
              </div>
            </CardContent>
          </Card>

          {/* Yearly */}
          <Card className="mb-2 border-rating/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-rating/10 flex items-center justify-center">
                  <Crown className="w-3 h-3 text-rating" />
                </div>
                <span className="text-xs font-medium text-foreground">Річний</span>
                <span className="text-[9px] bg-rating/10 text-rating px-1.5 py-0.5 rounded-full font-medium ml-auto">Гранд-приз</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>🏆 <span className="text-foreground font-medium">Топ-1:</span> Знижена націнка 25% на 3 міс + VIP-бейдж</p>
                <p>🥇 <span className="text-foreground font-medium">Топ 2-3:</span> Знижена націнка 28% на 1 міс</p>
                <p>🏆 <span className="text-foreground font-medium">Топ-1 товар:</span> Безкоштовна реклама 1 тиждень</p>
              </div>
            </CardContent>
          </Card>

          {/* Review bonuses for suppliers */}
          <div className="bg-accent/5 rounded-xl p-3 border border-accent/10 mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-accent-foreground" />
              <p className="text-[11px] font-medium text-foreground">Бонуси за відгуки (для постачальників)</p>
            </div>
            <div className="space-y-1 text-[10px] text-muted-foreground">
              <p>⭐ Кожен позитивний відгук (4-5★) на магазин = +0.1 бал до середнього рейтингу</p>
              <p>⭐ 50+ відгуків з рейтингом 4.5+ = бейдж "Перевірений магазин"</p>
              <p>⭐ Відгуки на товари впливають на позицію у пошуку та рекомендаціях</p>
              <p>⭐ Магазин з найбільшою кількістю відгуків за місяць = 1 безкоштовний пост</p>
            </div>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="bg-muted/50 rounded-xl p-3 border border-border/30">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              💡 <span className="font-medium">Як це працює:</span> Рейтинг клієнтів формується за кількістю замовлень, сумою покупок та кількістю товарів. Рейтинг постачальників — за продажами, оцінками магазину та відгуками на товари. Бонуси нараховуються автоматично.
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Button onClick={onGoToRatings} className="w-full gap-2" size="lg">
            <Trophy className="w-5 h-5" />
            Переглянути рейтинги
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
