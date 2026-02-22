import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Users, Copy, Check, Share2, Sparkles, ChevronLeft, Wallet, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { hapticNotification, hapticSelection } from "@/lib/haptics";
import { useNavigate } from "react-router-dom";

export default function Referrals() {
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useTelegramAuthContext();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const [invitedCount, setInvitedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const generateReferralCode = (userId: string): string => {
    const hash = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `TAV-${hash}`;
  };

  useEffect(() => {
    const initReferral = async () => {
      if (!profile?.id) {
        setIsLoading(false);
        return;
      }

      const code = generateReferralCode(profile.id);
      setReferralCode(code);

      if (!profile.referral_code) {
        await supabase
          .from("profiles")
          .update({ referral_code: code })
          .eq("id", profile.id);
      }

      const { count } = await supabase
        .from("profiles_safe" as any)
        .select("id", { count: "exact", head: true })
        .eq("referred_by", profile.id);

      setInvitedCount(count || 0);
      setIsLoading(false);
    };

    initReferral();
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
    const shareText = `🎁 Приєднуйся до Taverna та отримай бонуси!\n\nВикористай мій код: ${referralCode}\n\n`;
    const shareUrl = `https://t.me/${botUsername}/app?startapp=ref_${referralCode}`;

    if (window.Telegram?.WebApp?.openTelegramLink) {
      const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl);
    } else if (navigator.share) {
      navigator.share({ title: "Приєднуйся до Taverna!", text: shareText, url: shareUrl });
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, "_blank");
    }
  };

  const handleBack = () => {
    hapticSelection();
    navigate(-1);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="flex items-center h-14 px-4">
            <button onClick={handleBack} className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all mr-3">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Реферальна програма</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <Gift className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Увійдіть для участі</h2>
              <p className="text-muted-foreground mb-4">Авторизуйтесь через Telegram, щоб отримати свій реферальний код</p>
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
          <h1 className="text-lg font-semibold text-foreground">Реферальна програма</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-secondary/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]" />
          <div className="relative p-6 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Users className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">
              Запроси друга — отримай бонуси!
            </h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Ви та ваш друг отримуєте по 50₴ бонусів. Чим більше друзів — тим вища ставка!
            </p>
          </div>
        </motion.div>

        <div className="p-4 space-y-4">
          {/* Referral Code Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-2 border-dashed border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Ваш реферальний код
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-3 py-4">
                  <span className="text-3xl font-mono font-bold tracking-widest text-emerald-500">
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
          </motion.div>

          {/* Invited count */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-3xl font-bold text-emerald-500">{invitedCount}</p>
                <p className="text-sm text-muted-foreground">Запрошених друзів</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Поточна ставка: {invitedCount >= 50 ? 150 : invitedCount >= 20 ? 125 : invitedCount >= 10 ? 100 : invitedCount >= 5 ? 75 : 50}₴ за друга
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Progression Tiers */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Прогресія бонусів</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { threshold: 0, reward: 50, label: "Старт" },
                  { threshold: 5, reward: 75, label: "5 друзів" },
                  { threshold: 10, reward: 100, label: "10 друзів" },
                  { threshold: 20, reward: 125, label: "20 друзів" },
                  { threshold: 50, reward: 150, label: "50 друзів" },
                ].map((tier, idx) => {
                  const isActive = invitedCount >= tier.threshold;
                  const isCurrentTier = idx === [0, 5, 10, 20, 50].filter(t => invitedCount >= t).length - 1;
                  return (
                    <div key={tier.threshold} className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      isCurrentTier ? "border-emerald-500 bg-emerald-500/10" :
                      isActive ? "border-emerald-500/30 bg-muted/30" : "border-border opacity-60"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          isActive ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {isActive ? <Check className="w-4 h-4" /> : tier.threshold}
                        </div>
                        <span className="text-sm font-medium">{tier.label}</span>
                      </div>
                      <span className={cn("text-sm font-bold", isActive ? "text-emerald-500" : "text-muted-foreground")}>
                        {tier.reward}₴/друг
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* How it works */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Як це працює?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { step: 1, text: "Поділіться своїм кодом з друзями" },
                  { step: 2, text: "Друг реєструється та робить замовлення" },
                  { step: 3, text: "Ви обидва отримуєте по 50₴ бонусів!" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <span className="font-bold text-emerald-500">{item.step}</span>
                    </div>
                    <p className="text-sm">{item.text}</p>
                  </div>
                ))}
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
