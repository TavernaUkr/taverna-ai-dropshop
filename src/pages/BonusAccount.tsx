import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet, ChevronLeft, Users, Gift, Tag, ShoppingBag, ChevronRight,
  Coins, Sparkles, Copy, Check, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [referralEarned, setReferralEarned] = useState(0);
  const [activeBonusesCount, setActiveBonusesCount] = useState(0);
  const [activePromosCount, setActivePromosCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleBack = () => {
    hapticSelection();
    navigate(-1);
  };

  useEffect(() => {
    const loadSummary = async () => {
      if (!profile?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Referral data
        const code = profile.referral_code || `TAV-${profile.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
        setReferralCode(code);

        const { count } = await supabase
          .from("profiles_safe" as any)
          .select("id", { count: "exact", head: true })
          .eq("referred_by", profile.id);
        setInvitedCount(count || 0);
        setReferralEarned((count || 0) * 100);

        // Orders for bonus count calculation
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total")
          .eq("profile_id", profile.id)
          .limit(20);

        const totalOrders = orders?.length || 0;
        // Count active bonuses (same logic as PersonalBonuses page)
        let bonusCount = 2; // cashback + category always active
        const totalSpending = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        if (totalSpending > 5000) bonusCount++;
        if (totalOrders < 3) bonusCount++;
        if (totalOrders >= 10) bonusCount++;
        setActiveBonusesCount(bonusCount);

        // Active promos count
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
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-lg">
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

        {/* Stats Row - summary only, no details */}
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
                <p className="text-lg font-bold text-amber-500">{activeBonusesCount}</p>
                <p className="text-[10px] text-muted-foreground">Бонуси</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
              <CardContent className="p-3 text-center">
                <Tag className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-500">{activePromosCount}</p>
                <p className="text-[10px] text-muted-foreground">Акції</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Referral Code (compact, no full details) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-muted/80 rounded-lg p-2.5">
                    <span className="font-mono font-bold text-emerald-500 tracking-wider text-sm">{referralCode}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={handleCopyCode}>
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {invitedCount > 0 ? `${invitedCount} друзів запрошено` : "Поділіться кодом — отримайте 100₴ за друга"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Navigation Cards - link to dedicated pages */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-3">
            <button
              onClick={() => { hapticSelection(); navigate("/referrals"); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-emerald-500/20 bg-card hover:border-emerald-500/40 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">Реферальна програма</p>
                <p className="text-xs text-muted-foreground">Запрошуйте друзів та заробляйте</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            <button
              onClick={() => { hapticSelection(); navigate("/personal-bonuses"); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-amber-500/20 bg-card hover:border-amber-500/40 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">Персональні бонуси</p>
                <p className="text-xs text-muted-foreground">AI-пропозиції під вашу активність</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            <button
              onClick={() => { hapticSelection(); navigate("/promos"); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-purple-500/20 bg-card hover:border-purple-500/40 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">Акції та промокоди</p>
                <p className="text-xs text-muted-foreground">Активні знижки та flash-продажі</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </motion.div>

          {/* Spend CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Button
              onClick={() => { hapticSelection(); navigate("/"); }}
              className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              size="lg"
            >
              <ShoppingBag className="w-5 h-5" />
              Витратити бонуси
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
