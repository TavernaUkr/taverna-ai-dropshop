import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, ChevronLeft, Sparkles, TrendingUp, ShoppingBag, Eye, Truck, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { useBonuses } from "@/hooks/useBonuses";
import { hapticSelection, hapticNotification } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PersonalizedBonus {
  id: string;
  type: "cashback" | "category_discount" | "delivery" | "product" | "loyalty";
  title: string;
  description: string;
  value: string;
  icon: string;
  status: "active" | "available" | "upcoming";
  expiresAt?: Date;
}

export default function PersonalBonuses() {
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useTelegramAuthContext();
  const { balance, totalEarned, totalSpent } = useBonuses();
  const [isLoading, setIsLoading] = useState(true);
  const [personalizedBonuses, setPersonalizedBonuses] = useState<PersonalizedBonus[]>([]);

  const handleBack = () => {
    hapticSelection();
    navigate(-1);
  };

  // Generate personalized bonuses based on user activity
  useEffect(() => {
    const generatePersonalizedBonuses = async () => {
      if (!profile?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user's order history for personalization
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total, created_at")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(10);

        // Generate bonuses based on activity
        const bonuses: PersonalizedBonus[] = [];

        // Cashback based on total spending
        const totalOrders = orders?.length || 0;
        const totalSpending = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

        // Loyalty cashback (increases with more orders)
        const cashbackRate = Math.min(5 + totalOrders, 15); // 5-15%
        bonuses.push({
          id: "cashback",
          type: "cashback",
          title: `Кешбек ${cashbackRate}%`,
          description: totalOrders > 5 
            ? "Преміум рівень за вашу лояльність!" 
            : "На наступне замовлення",
          value: `${cashbackRate}%`,
          icon: "💰",
          status: "active",
        });

        // Category discount based on frequent purchases
        bonuses.push({
          id: "category",
          type: "category_discount",
          title: "-10% на улюблену категорію",
          description: "Тактичне спорядження",
          value: "-10%",
          icon: "🎯",
          status: "active",
        });

        // Free delivery threshold
        bonuses.push({
          id: "delivery",
          type: "delivery",
          title: "Безкоштовна доставка",
          description: totalSpending > 5000 
            ? "Завжди безкоштовно для VIP" 
            : "При замовленні від 1500₴",
          value: "0₴",
          icon: "🚚",
          status: totalSpending > 5000 ? "active" : "available",
        });

        // Review bonus
        bonuses.push({
          id: "review",
          type: "loyalty",
          title: "+25₴ за відгук",
          description: "Залиште відгук на куплений товар",
          value: "+25₴",
          icon: "⭐",
          status: "available",
        });

        // Welcome bonus for new users
        if (totalOrders < 3) {
          bonuses.push({
            id: "welcome",
            type: "product",
            title: "-20% на перші 3 замовлення",
            description: `Залишилось: ${3 - totalOrders} замовлень`,
            value: "-20%",
            icon: "🎁",
            status: "active",
          });
        }

        // VIP bonus for loyal customers
        if (totalOrders >= 10) {
          bonuses.push({
            id: "vip",
            type: "loyalty",
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
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all mr-3"
            >
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
              <p className="text-muted-foreground mb-4">
                Авторизуйтесь через Telegram, щоб побачити ваші персональні бонуси
              </p>
              <Button onClick={() => navigate("/")} className="w-full">
                На головну
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      {/* Header with back button */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all mr-3"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Персональні бонуси</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero Section with Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-primary/10 to-secondary/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(120,119,198,0.3),transparent_50%)]" />
          
          <div className="relative p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center"
            >
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <h1 className="text-2xl font-bold mb-2">
              Ваш баланс: <span className="text-primary">{balance}₴</span>
            </h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Персональні пропозиції на основі вашої активності
            </p>
          </div>
        </motion.div>

        <div className="p-4 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-primary">{totalEarned}₴</p>
                  <p className="text-xs text-muted-foreground">Зароблено всього</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-accent/10 to-primary/5 border-accent/20">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-accent/20 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-accent" />
                  </div>
                  <p className="text-2xl font-bold text-accent">{totalSpent}₴</p>
                  <p className="text-xs text-muted-foreground">Використано</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Personalized Bonuses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  Ваші персональні бонуси
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm">Аналізуємо вашу активність...</p>
                  </div>
                ) : personalizedBonuses.length > 0 ? (
                  personalizedBonuses.map((bonus) => (
                    <motion.div
                      key={bonus.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-all"
                    >
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

          {/* How to earn more */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Як отримати більше бонусів?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { icon: <Star className="w-4 h-4" />, text: "Робіть покупки — накопичуйте кешбек" },
                  { icon: <Eye className="w-4 h-4" />, text: "Переглядайте товари — отримуйте рекомендації" },
                  { icon: <Tag className="w-4 h-4" />, text: "Залишайте відгуки — отримуйте бали" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {item.icon}
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => {
                hapticSelection();
                navigate("/");
              }}
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
