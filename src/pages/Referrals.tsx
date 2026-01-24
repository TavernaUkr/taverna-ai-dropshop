import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Users, Copy, Check, Share2, Coins, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { useBonuses } from "@/hooks/useBonuses";
import { supabase } from "@/integrations/supabase/client";
import { hapticNotification, hapticSelection } from "@/lib/haptics";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useNavigate } from "react-router-dom";

interface ReferralStats {
  invitedCount: number;
  pendingRewards: number;
}

export default function Referrals() {
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useTelegramAuthContext();
  const { balance, totalEarned } = useBonuses();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats>({ invitedCount: 0, pendingRewards: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Generate referral code based on user_id
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

      // Save referral code to profile if not set
      if (!profile.referral_code) {
        await supabase
          .from("profiles")
          .update({ referral_code: code })
          .eq("id", profile.id);
      }

      // Fetch invited friends count
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", profile.id);

      setStats({
        invitedCount: count || 0,
        pendingRewards: 0,
      });

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
    const shareText = `🎁 Приєднуйся до Taverna та отримай 100₴ бонусів!\n\nВикористай мій код: ${referralCode}\n\n`;
    const shareUrl = `https://t.me/${botUsername}/app?startapp=ref_${referralCode}`;

    // Check if running in Telegram WebApp
    if (window.Telegram?.WebApp?.openTelegramLink) {
      const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl);
    } else {
      // Fallback for browser
      if (navigator.share) {
        navigator.share({
          title: "Приєднуйся до Taverna!",
          text: shareText,
          url: shareUrl,
        });
      } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, "_blank");
      }
    }
  };

  const handleTabChange = (tab: string) => {
    hapticSelection();
    switch (tab) {
      case "catalog":
        navigate("/");
        break;
      case "suppliers":
        navigate("/suppliers");
        break;
      case "live":
        navigate("/promos");
        break;
      case "support":
        navigate("/support");
        break;
      case "account":
        navigate("/");
        break;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <Gift className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Увійдіть для участі</h2>
              <p className="text-muted-foreground mb-4">
                Авторизуйтесь через Telegram, щоб отримати свій реферальний код
              </p>
              <Button onClick={() => navigate("/")} className="w-full">
                На головну
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNavigation activeTab="account" onTabChange={handleTabChange} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      <Header />

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),transparent_50%)]" />
          
          <div className="relative p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
            >
              <Gift className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <h1 className="text-2xl font-bold mb-2">
              Запроси друга — отримай{" "}
              <span className="text-primary">100₴</span>
            </h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Поділіться своїм кодом з друзями. Коли вони зроблять перше замовлення, ви обидва отримаєте бонуси!
            </p>
          </div>
        </motion.div>

        <div className="p-4 space-y-4">
          {/* Referral Code Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Ваш реферальний код
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-3 py-4">
                  <span className="text-3xl font-mono font-bold tracking-widest text-primary">
                    {isLoading ? "..." : referralCode}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyCode}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>

                <Button
                  onClick={handleShare}
                  className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  size="lg"
                >
                  <Share2 className="w-5 h-5" />
                  Поділитися в Telegram
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-green-500">{totalEarned}₴</p>
                  <p className="text-xs text-muted-foreground">Зароблено бонусів</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-500">{stats.invitedCount}</p>
                  <p className="text-xs text-muted-foreground">Запрошених друзів</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Current Balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Поточний баланс</p>
                    <p className="text-3xl font-bold">{balance}₴</p>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      hapticSelection();
                      navigate("/");
                    }}
                  >
                    Витратити
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Як це працює?</CardTitle>
              </CardHeader>
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
          </motion.div>
        </div>
      </main>

      <BottomNavigation activeTab="account" onTabChange={handleTabChange} />
    </div>
  );
}
