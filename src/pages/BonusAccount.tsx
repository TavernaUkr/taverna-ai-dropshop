import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  ChevronLeft,
  Users,
  Gift,
  Tag,
  TrendingUp,
  ShoppingBag,
  Star,
  Eye,
  Share2,
  Heart,
  ChevronRight,
  Coins,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { useBonuses } from "@/hooks/useBonuses";
import { hapticSelection, hapticNotification } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BonusHistoryItem {
  id: string;
  type: "referral" | "personal" | "promo" | "spend";
  title: string;
  amount: number;
  date: string;
  icon: string;
}

interface PersonalBonus {
  id: string;
  title: string;
  description: string;
  value: string;
  icon: string;
  status: "active" | "available" | "upcoming";
}

interface ActivePromo {
  id: string;
  code: string;
  description: string;
  discount: string;
  validUntil?: string;
}

export default function BonusAccount() {
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useTelegramAuthContext();
  const { balance, totalEarned, totalSpent } = useBonuses();
  const [activeTab, setActiveTab] = useState("overview");
  const [referralCode, setReferralCode] = useState("");
  const [invitedCount, setInvitedCount] = useState(0);
  const [referralEarned, setReferralEarned] = useState(0);
  const [personalBonuses, setPersonalBonuses] = useState<PersonalBonus[]>([]);
  const [activePromos, setActivePromos] = useState<ActivePromo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleBack = () => {
    hapticSelection();
    navigate(-1);
  };

  useEffect(() => {
    const loadAllData = async () => {
      if (!profile?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. Referral data
        const code = profile.referral_code || `TAV-${profile.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
        setReferralCode(code);

        const { count } = await supabase
          .from("profiles_safe" as any)
          .select("id", { count: "exact", head: true })
          .eq("referred_by", profile.id);
        setInvitedCount(count || 0);
        setReferralEarned((count || 0) * 100);

        // 2. Orders for personal bonuses calculation
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total, created_at")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(20);

        const totalOrders = orders?.length || 0;
        const totalSpending = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

        // Generate personal bonuses
        const bonuses: PersonalBonus[] = [];
        const cashbackRate = Math.min(5 + totalOrders, 15);
        bonuses.push({
          id: "cashback",
          title: `Кешбек ${cashbackRate}%`,
          description: totalOrders > 5 ? "Преміум рівень за лояльність!" : "На наступне замовлення",
          value: `${cashbackRate}%`,
          icon: "💰",
          status: "active",
        });

        bonuses.push({
          id: "category",
          title: "-10% на улюблену категорію",
          description: "Персональна знижка",
          value: "-10%",
          icon: "🎯",
          status: "active",
        });

        bonuses.push({
          id: "delivery",
          title: "Безкоштовна доставка",
          description: totalSpending > 5000 ? "Завжди для VIP" : "При замовленні від 1500₴",
          value: "0₴",
          icon: "🚚",
          status: totalSpending > 5000 ? "active" : "available",
        });

        bonuses.push({
          id: "review",
          title: "+25₴ за відгук",
          description: "Залиште відгук на куплений товар",
          value: "+25₴",
          icon: "⭐",
          status: "available",
        });

        if (totalOrders < 3) {
          bonuses.push({
            id: "welcome",
            title: "-20% на перші 3 замовлення",
            description: `Залишилось: ${3 - totalOrders}`,
            value: "-20%",
            icon: "🎁",
            status: "active",
          });
        }

        if (totalOrders >= 10) {
          bonuses.push({
            id: "vip",
            title: "VIP статус",
            description: "Ексклюзивні знижки та пріоритетна підтримка",
            value: "VIP",
            icon: "👑",
            status: "active",
          });
        }

        setPersonalBonuses(bonuses);

        // 3. Active promo codes
        const { data: promos } = await supabase
          .from("promo_codes")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(5);

        if (promos) {
          setActivePromos(
            promos.map((p) => ({
              id: p.id,
              code: p.code,
              description: p.discount_percent
                ? `Знижка ${p.discount_percent}%`
                : `Знижка ${p.discount_amount}₴`,
              discount: p.discount_percent ? `${p.discount_percent}%` : `${p.discount_amount}₴`,
              validUntil: p.valid_until || undefined,
            }))
          );
        }
      } catch (error) {
        console.error("Error loading bonus data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [profile?.id]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    hapticNotification("success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    hapticSelection();
    const botUsername = "TavernaBot";
    const shareText = `🎁 Приєднуйся до Taverna та отримай 100₴ бонусів!\n\nВикористай мій код: ${referralCode}\n\n`;
    const shareUrl = `https://t.me/${botUsername}/app?startapp=ref_${referralCode}`;

    if ((window as any).Telegram?.WebApp?.openTelegramLink) {
      const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
      (window as any).Telegram.WebApp.openTelegramLink(telegramShareUrl);
    } else if (navigator.share) {
      navigator.share({ title: "Приєднуйся до Taverna!", text: shareText, url: shareUrl });
    } else {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
        "_blank"
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="flex items-center h-14 px-4">
            <button onClick={handleBack} className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all mr-3">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Бонусний рахунок</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Увійдіть для доступу</h2>
              <p className="text-muted-foreground mb-4">Авторизуйтесь через Telegram для перегляду бонусного рахунку</p>
              <Button onClick={() => navigate("/")} className="w-full">На головну</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center h-14 px-4">
          <button onClick={handleBack} className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all mr-3">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Бонусний рахунок</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero Balance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-emerald-500/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(120,119,198,0.3),transparent_60%)]" />

          <div className="relative p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-lg"
            >
              <Wallet className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <p className="text-sm text-muted-foreground mb-1">Загальний баланс</p>
            <h1 className="text-4xl font-bold mb-1">
              <span className="text-primary">{balance}₴</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Зароблено: {totalEarned}₴ • Використано: {totalSpent}₴
            </p>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 px-4 -mt-2">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20">
              <CardContent className="p-3 text-center">
                <Users className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-500">{referralEarned}₴</p>
                <p className="text-[10px] text-muted-foreground">Реферали</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
              <CardContent className="p-3 text-center">
                <Sparkles className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-500">{personalBonuses.filter(b => b.status === "active").length}</p>
                <p className="text-[10px] text-muted-foreground">Бонуси</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
              <CardContent className="p-3 text-center">
                <Tag className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-500">{activePromos.length}</p>
                <p className="text-[10px] text-muted-foreground">Акції</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="p-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 h-11">
              <TabsTrigger value="overview" className="text-xs gap-1">
                <Wallet className="h-3.5 w-3.5" />
                Огляд
              </TabsTrigger>
              <TabsTrigger value="referral" className="text-xs gap-1">
                <Users className="h-3.5 w-3.5" />
                Реферали
              </TabsTrigger>
              <TabsTrigger value="bonuses" className="text-xs gap-1">
                <Gift className="h-3.5 w-3.5" />
                Бонуси
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Referral Quick Card */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-2 border-dashed border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-semibold text-sm">Реферальна програма</h3>
                      </div>
                      <span className="text-xs font-medium bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full">
                        +100₴/друг
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 bg-muted/80 rounded-lg p-2 text-center">
                        <span className="font-mono font-bold text-primary tracking-wider">{referralCode}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={handleCopyCode}>
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleShare} className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white" size="sm">
                        <Share2 className="w-4 h-4" />
                        Поділитися
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { hapticSelection(); setActiveTab("referral"); }} className="gap-1">
                        Детальніше
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Active Personal Bonuses Preview */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Персональні бонуси
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => setActiveTab("bonuses")}>
                        Всі <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                      </div>
                    ) : (
                      personalBonuses.filter(b => b.status === "active").slice(0, 3).map((bonus) => (
                        <div key={bonus.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 border border-border">
                          <span className="text-lg">{bonus.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-xs">{bonus.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{bonus.description}</p>
                          </div>
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{bonus.value}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Active Promotions Preview */}
              {activePromos.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Tag className="w-4 h-4 text-purple-500" />
                          Активні акції
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => { hapticSelection(); navigate("/promos"); }}>
                          Всі <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {activePromos.slice(0, 3).map((promo) => (
                        <div key={promo.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 border border-border">
                          <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                            <Tag className="w-4 h-4 text-purple-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-mono font-medium text-foreground text-xs">{promo.code}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{promo.description}</p>
                          </div>
                          <span className="text-xs font-bold text-purple-500">{promo.discount}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* How to earn */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Як заробляти бонуси?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { icon: <Users className="w-4 h-4" />, text: "Запрошуйте друзів — 100₴ за кожного" },
                      { icon: <Star className="w-4 h-4" />, text: "Робіть покупки — кешбек до 15%" },
                      { icon: <Eye className="w-4 h-4" />, text: "Переглядайте товари — персональні знижки" },
                      { icon: <Heart className="w-4 h-4" />, text: "Додавайте в улюблене — бонусні пропозиції" },
                      { icon: <Share2 className="w-4 h-4" />, text: "Діліться товарами — додаткові бали" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          {item.icon}
                        </div>
                        <span className="text-xs">{item.text}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Referral Tab */}
            <TabsContent value="referral" className="mt-4 space-y-4">
              <Card className="border-2 border-dashed border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Ваш реферальний код
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center gap-3 py-3">
                    <span className="text-3xl font-mono font-bold tracking-widest text-primary">
                      {isLoading ? "..." : referralCode}
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleCopyCode} className="shrink-0">
                      {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                    </Button>
                  </div>
                  <Button onClick={handleShare} className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white" size="lg">
                    <Share2 className="w-5 h-5" />
                    Поділитися в Telegram
                  </Button>
                </CardContent>
              </Card>

              {/* Referral Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20">
                  <CardContent className="p-4 text-center">
                    <Coins className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-emerald-500">{referralEarned}₴</p>
                    <p className="text-xs text-muted-foreground">Зароблено з рефералів</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
                  <CardContent className="p-4 text-center">
                    <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-500">{invitedCount}</p>
                    <p className="text-xs text-muted-foreground">Запрошених друзів</p>
                  </CardContent>
                </Card>
              </div>

              {/* How it works */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Як це працює?</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { step: 1, text: "Поділіться своїм кодом з друзями" },
                    { step: 2, text: "Друг реєструється та робить замовлення" },
                    { step: 3, text: "Ви обидва отримуєте по 100₴ бонусів!" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="font-bold text-primary">{item.step}</span>
                      </div>
                      <p className="text-sm">{item.text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bonuses Tab */}
            <TabsContent value="bonuses" className="mt-4 space-y-4">
              {/* Balance card */}
              <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-amber-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Баланс бонусів</p>
                      <p className="text-3xl font-bold">{balance}₴</p>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={() => { hapticSelection(); navigate("/"); }}>
                      Витратити <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Bonuses List */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    Персональні бонуси
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                      <p className="text-sm">Аналізуємо вашу активність...</p>
                    </div>
                  ) : personalBonuses.length > 0 ? (
                    personalBonuses.map((bonus) => (
                      <div key={bonus.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-all">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                          <span className="text-xl">{bonus.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{bonus.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{bonus.description}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                          bonus.status === "active"
                            ? "bg-primary/10 text-primary"
                            : bonus.status === "available"
                            ? "bg-accent/10 text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {bonus.status === "active" ? "Активний" : bonus.status === "available" ? "Доступно" : "Скоро"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Бонуси з'являться після першого замовлення</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tip: AI regulates bonuses */}
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4 text-center">
                  <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Персональні бонуси формуються автоматично на основі вашої активності: замовлень, переглядів, відгуків та улюблених товарів. AI аналізує вашу поведінку, щоб запропонувати найкращі знижки.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Quick action */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Button
              onClick={() => { hapticSelection(); navigate("/"); }}
              className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              <ShoppingBag className="w-5 h-5" />
              Перейти до покупок
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
