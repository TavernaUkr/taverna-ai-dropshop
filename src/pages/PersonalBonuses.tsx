import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, ChevronLeft, Sparkles, Star, Tag, Wallet, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { hapticSelection, hapticNotification } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PersonalizedBonus {
  id: string;
  title: string;
  description: string;
  value: string;
  icon: string;
  status: "active" | "available" | "upcoming";
}

export default function PersonalBonuses() {
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useTelegramAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [personalizedBonuses, setPersonalizedBonuses] = useState<PersonalizedBonus[]>([]);

  const handleBack = () => {
    hapticSelection();
    navigate(-1);
  };

  useEffect(() => {
    const generatePersonalizedBonuses = async () => {
      if (!profile?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total, created_at")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(10);

        const bonuses: PersonalizedBonus[] = [];
        const totalOrders = orders?.length || 0;
        const totalSpending = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

        // Balanced cashback: 2% base, max 3% at 10+ orders
        const cashbackRate = Math.min(2 + Math.floor(totalOrders / 10), 3);
        bonuses.push({
          id: "cashback",
          title: `Кешбек ${cashbackRate}%`,
          description: totalOrders > 10 ? "Преміум рівень за вашу лояльність!" : "На наступне замовлення",
          value: `${cashbackRate}%`,
          icon: "💰",
          status: "active",
        });

        bonuses.push({
          id: "category",
          title: "-5% на улюблену категорію",
          description: "Тактичне спорядження",
          value: "-5%",
          icon: "🎯",
          status: "active",
        });

        bonuses.push({
          id: "delivery",
          title: "Безкоштовна доставка",
          description: totalSpending > 10000 ? "Завжди безкоштовно для VIP" : "При замовленні від 2000₴",
          value: "0₴",
          icon: "🚚",
          status: totalSpending > 10000 ? "active" : "available",
        });

        bonuses.push({
          id: "review",
          title: "+15₴ за відгук",
          description: "Залиште відгук на куплений товар",
          value: "+15₴",
          icon: "⭐",
          status: "available",
        });

        if (totalOrders < 3) {
          bonuses.push({
            id: "welcome",
            title: "-10% на перші 3 замовлення",
            description: `Залишилось: ${3 - totalOrders} замовлень`,
            value: "-10%",
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

        setPersonalizedBonuses(bonuses);
      } catch (error) {
        console.error("Error generating bonuses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    generatePersonalizedBonuses();
  }, [profile?.id]);

  const handleActivateBonus = (bonus: PersonalizedBonus) => {
    hapticNotification("success");
    toast.success(`Бонус "${bonus.title}" активовано!`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="flex items-center h-14 px-4">
            <button onClick={handleBack} className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all mr-3">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Персональні бонуси</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Увійдіть для доступу</h2>
              <p className="text-muted-foreground mb-4">Авторизуйтесь через Telegram, щоб побачити ваші персональні бонуси</p>
              <Button onClick={() => navigate("/")} className="w-full">На головну</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center h-14 px-4">
          <button onClick={handleBack} className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all mr-3">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Персональні бонуси</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero Section - NO balance, just context */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-secondary/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(245,158,11,0.3),transparent_50%)]" />
          <div className="relative p-6 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">Персональні пропозиції</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              AI аналізує вашу активність та формує унікальні знижки саме для вас
            </p>
          </div>
        </motion.div>

        <div className="p-4 space-y-4">
          {/* Personalized Bonuses List */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-500" />
                  Ваші персональні бонуси
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm">Аналізуємо вашу активність...</p>
                  </div>
                ) : personalizedBonuses.length > 0 ? (
                  personalizedBonuses.map((bonus) => (
                    <motion.div
                      key={bonus.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:border-amber-500/30 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center shrink-0">
                        <span className="text-xl">{bonus.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{bonus.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{bonus.description}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                        bonus.status === "active"
                          ? "bg-amber-500/10 text-amber-500"
                          : bonus.status === "available"
                          ? "bg-accent/10 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {bonus.value}
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Бонуси з'являться після першого замовлення</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* How to earn - unique to this page */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Як отримати більше бонусів?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { icon: <Star className="w-4 h-4" />, text: "Робіть покупки — накопичуйте кешбек" },
                  { icon: <Tag className="w-4 h-4" />, text: "Залишайте відгуки — отримуйте бали" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                      {item.icon}
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* AI info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-4 text-center">
                <Sparkles className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Бонуси формуються автоматично на основі ваших замовлень, переглядів та відгуків.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Link to Bonus Account */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Button
              onClick={() => { hapticSelection(); navigate("/bonus-account"); }}
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              <Wallet className="w-5 h-5" />
              Переглянути бонусний рахунок
              <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
