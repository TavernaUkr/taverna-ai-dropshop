import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Gift,
  Settings,
  User,
  Bell,
  ChevronRight,
  LogOut,
  Copy,
  Check,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { OrdersHistory } from "@/components/OrdersHistory";
import { toast } from "sonner";

export const ProfileDashboard = () => {
  const { isAuthenticated, profile, logout } = useTelegramAuthContext();
  const [activeTab, setActiveTab] = useState("orders");
  const [copied, setCopied] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Affiliate data (mock)
  const affiliateData = {
    balance: 150,
    referralCount: 3,
    referralLink: `https://t.me/TavernaBot/app?startapp=ref_${profile?.id?.slice(0, 8) || "guest"}`,
  };

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(affiliateData.referralLink);
      setCopied(true);
      toast.success("Реферальне посилання скопійовано");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Не вдалося скопіювати");
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Ви вийшли з акаунту");
  };

  const getUserInitials = () => {
    if (profile) {
      const first = profile.first_name?.[0] || "";
      const last = profile.last_name?.[0] || "";
      return (first + last).toUpperCase() || "U";
    }
    return "Г";
  };

  const getDisplayName = () => {
    if (profile) {
      const parts = [profile.first_name, profile.last_name].filter(Boolean);
      return parts.join(" ") || profile.telegram_username || "Користувач";
    }
    return "Гість";
  };

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      {/* User Card */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-primary">{getUserInitials()}</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{getDisplayName()}</h3>
            {isAuthenticated ? (
              <p className="text-sm text-muted-foreground">
                {profile?.telegram_username
                  ? `@${profile.telegram_username}`
                  : profile?.phone || "Авторизовано"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Увійдіть для повного доступу</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-12">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Замовлення</span>
          </TabsTrigger>
          <TabsTrigger value="affiliate" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Бонуси</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Налаштування</span>
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-4">
          <OrdersHistory />
        </TabsContent>

        {/* Affiliate Tab */}
        <TabsContent value="affiliate" className="mt-4 space-y-4">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl p-5 border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Мій бонусний баланс</span>
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-bold text-foreground">
              {affiliateData.balance} ₴
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Можна використати при наступному замовленні
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <div className="text-2xl font-bold text-primary">
                {affiliateData.referralCount}
              </div>
              <p className="text-sm text-muted-foreground">Запрошених друзів</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <div className="text-2xl font-bold text-primary">100 ₴</div>
              <p className="text-sm text-muted-foreground">За кожного друга</p>
            </div>
          </div>

          {/* Referral Link */}
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <h4 className="font-medium text-foreground">Реферальне посилання</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono text-muted-foreground truncate">
                {affiliateData.referralLink}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyReferralLink}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Поділіться посиланням з друзями та отримуйте бонуси за кожну їх покупку
            </p>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Notifications */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Сповіщення</p>
                  <p className="text-sm text-muted-foreground">
                    Отримувати сповіщення про замовлення
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            {/* Profile */}
            <button className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Мої дані</p>
                  <p className="text-sm text-muted-foreground">
                    Редагувати особисту інформацію
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Addresses */}
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Адреси доставки</p>
                  <p className="text-sm text-muted-foreground">
                    Керування адресами
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Logout */}
          {isAuthenticated && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Вийти з акаунту
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
