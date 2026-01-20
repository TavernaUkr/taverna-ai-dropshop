import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Briefcase,
  Store,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { OrdersHistory } from "@/components/OrdersHistory";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const ProfileDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profile, logout } = useTelegramAuthContext();
  const [activeTab, setActiveTab] = useState("orders");
  const [copied, setCopied] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Check if user is a supplier based on user_type
  const isSupplier = profile?.user_type === "supplier" || profile?.user_type === "admin";
  const isAdmin = profile?.user_type === "admin";

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

  const handlePartnerClick = () => {
    if (isSupplier || isAdmin) {
      // User is already a supplier/admin - go to manager dashboard
      navigate("/manager");
    } else {
      // User is not a supplier - go to registration
      navigate("/partner");
    }
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

  const handleAuthClick = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      // Trigger the auth confirmation dialog
      window.dispatchEvent(new CustomEvent('taverna:request-auth'));
    } else {
      toast.error('Відкрийте додаток через Telegram');
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      {/* User Card */}
      <div className="bg-card rounded-2xl p-5 shadow-lg border border-border">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden shadow-md ring-2 ring-primary/20">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-primary">{getUserInitials()}</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{getDisplayName()}</h3>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {profile?.telegram_username
                    ? `@${profile.telegram_username}`
                    : profile?.phone || "Авторизовано"}
                </p>
                {isSupplier && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    Партнер
                  </span>
                )}
                {isAdmin && (
                  <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">
                    Адмін
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Увійдіть для повного доступу</p>
            )}
          </div>
        </div>
      </div>

      {/* Authorization Button for Guests */}
      {!isAuthenticated && (
        <button
          onClick={handleAuthClick}
          className="w-full py-4 px-6 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <User className="h-5 w-5" />
          <span>
            Авторизувати мене
            {(() => {
              const tg = (window as any).Telegram?.WebApp;
              if (tg?.initDataUnsafe?.user) {
                const user = tg.initDataUnsafe.user;
                const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
                return ` — "${name || user.username || 'Telegram'}"`;
              }
              return ' через Telegram';
            })()}
          </span>
        </button>
      )}

      {/* Partner Panel Button - Only for authenticated Telegram users */}
      {isAuthenticated && (
        <button
          onClick={handlePartnerClick}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl border transition-all",
            isSupplier || isAdmin
              ? "bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary"
              : "bg-card border-border hover:border-primary hover:bg-primary/5"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            isSupplier || isAdmin ? "bg-primary/20" : "bg-muted"
          )}>
            {isSupplier || isAdmin ? (
              <Store className="h-6 w-6 text-primary" />
            ) : (
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 text-left">
            <h4 className="font-semibold text-foreground">
              {isSupplier || isAdmin ? "Панель партнера" : "Стати партнером"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {isSupplier || isAdmin
                ? "Керуйте товарами та замовленнями"
                : "Продавайте товари через Taverna"}
            </p>
          </div>
          <ChevronRight className={cn(
            "h-5 w-5",
            isSupplier || isAdmin ? "text-primary" : "text-muted-foreground"
          )} />
        </button>
      )}

      {/* Tabs - Only show full tabs when authenticated */}
      {isAuthenticated ? (
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
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Вийти з акаунту
            </Button>
          </TabsContent>
        </Tabs>
      ) : (
        /* Guest View - Limited info */
        <div className="bg-card rounded-xl p-6 border border-border text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">Авторизуйтесь для доступу</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Переглядайте історію замовлень, керуйте адресами доставки та отримуйте бонуси
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="p-3 bg-muted rounded-lg">
              <Package className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Замовлення</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <Gift className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Бонуси</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <Settings className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Налаштування</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
