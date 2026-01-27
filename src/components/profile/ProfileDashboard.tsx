import { useState, useEffect } from "react";
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
  Store,
  HelpCircle,
  BookOpen,
  Users,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { OrdersHistory } from "@/components/OrdersHistory";
import { toast } from "sonner";
import { SupplierGuideModal } from "@/components/SupplierGuideModal";
import { CustomerGuideModal } from "@/components/CustomerGuideModal";
import { hapticSelection } from "@/lib/haptics";
import { DevRoleSwitcher } from "@/components/profile/DevRoleSwitcher";

type TestRole = "guest" | "customer" | "supplier" | "moderator" | "admin";

export const ProfileDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated: realIsAuthenticated, profile: realProfile, logout } = useTelegramAuthContext();
  const [activeTab, setActiveTab] = useState("orders");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showSupplierGuide, setShowSupplierGuide] = useState(false);
  const [showCustomerGuide, setShowCustomerGuide] = useState(false);
  
  // DEV MODE: Test role switcher
  const [testRole, setTestRole] = useState<TestRole>("guest");
  const isDevMode = import.meta.env.DEV || window.location.hostname.includes("lovable.app");
  
  // Determine effective auth state based on test role (for dev testing)
  const isAuthenticated = isDevMode && testRole !== "guest" ? true : realIsAuthenticated;
  const profile = isDevMode && testRole !== "guest" 
    ? { 
        ...realProfile, 
        first_name: `Test ${testRole.charAt(0).toUpperCase() + testRole.slice(1)}`,
        roles: testRole === "customer" ? [] : [testRole]
      } 
    : realProfile;

  // Check roles from secure user_roles table (not from profile.user_type to prevent privilege escalation)
  const userRoles = profile?.roles || [];
  const isSupplier = userRoles.includes('supplier') || userRoles.includes('admin');
  const isAdmin = userRoles.includes('admin');
  const isModerator = userRoles.includes('moderator');

  // Affiliate data (mock)
  const affiliateData = {
    balance: 150,
    referralCount: 3,
    referralLink: `https://t.me/TavernaBot/app?startapp=ref_${profile?.id?.slice(0, 8) || "guest"}`,
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Ви вийшли з акаунту");
  };

  const handlePartnerClick = () => {
    if (isSupplier || isAdmin || isModerator) {
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

      {/* Partner Panel Button - Only for suppliers/admins/moderators */}
      {isAuthenticated && (isSupplier || isAdmin || isModerator) && (
        <button
          onClick={handlePartnerClick}
          className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/20">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <h4 className="font-semibold text-foreground">Панель партнера</h4>
            <p className="text-xs text-muted-foreground">
              Керуйте товарами та замовленнями
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-primary" />
        </button>
      )}

      {/* Referral Program Button - For all authenticated users */}
      {isAuthenticated && (
        <button
          onClick={() => {
            hapticSelection();
            navigate("/referrals");
          }}
          className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20 hover:border-primary hover:from-primary/10 hover:to-accent/10"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <h4 className="font-semibold text-foreground">Реферальна програма</h4>
            <p className="text-xs text-muted-foreground">
              Запрошуй друзів — отримуй 100₴
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
              +100₴
            </span>
            <ChevronRight className="h-5 w-5 text-primary" />
          </div>
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

          {/* Bonuses Tab */}
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

            {/* Personalized Offers Section */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  Персональні пропозиції
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Спеціально підібрані бонуси на основі ваших вподобань
                </p>
              </div>
              
              {/* Personalized Bonus Items */}
              <div className="divide-y divide-border">
                {/* Cashback offer */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">💰</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">Кешбек 5%</p>
                    <p className="text-xs text-muted-foreground">На наступне замовлення</p>
                  </div>
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                    Активний
                  </span>
                </div>

                {/* Category discount */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">-10% на улюблену категорію</p>
                    <p className="text-xs text-muted-foreground">Тактичне спорядження</p>
                  </div>
                  <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-1 rounded-full">
                    Новий
                  </span>
                </div>

                {/* Free delivery */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-lg">🚚</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">Безкоштовна доставка</p>
                    <p className="text-xs text-muted-foreground">При замовленні від 1500₴</p>
                  </div>
                  <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-full">
                    Доступно
                  </span>
                </div>
              </div>
            </div>

            {/* Promo Codes Section */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="text-lg">🏷️</span>
                  Мої промокоди
                </h4>
              </div>
              
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">Поки що у вас немає активних промокодів</p>
                <Button 
                  variant="link" 
                  className="mt-2 text-primary"
                  onClick={() => navigate("/promos")}
                >
                  Переглянути акції
                </Button>
              </div>
            </div>

            {/* Info about earning bonuses */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <h4 className="font-medium text-foreground text-sm mb-2">Як отримати більше бонусів?</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Запрошуйте друзів — отримуйте 100₴ за кожного</li>
                <li>• Робіть покупки — накопичуйте кешбек</li>
                <li>• Залишайте відгуки — отримуйте бали</li>
              </ul>
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

              {/* Help Guides */}
              <Separator />
              <button 
                onClick={() => setShowCustomerGuide(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">Як користуватись</p>
                    <p className="text-sm text-muted-foreground">
                      Інструкція для покупців
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              {(isSupplier || isAdmin) && (
                <button 
                  onClick={() => setShowSupplierGuide(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-t border-border"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-foreground">Гід для партнерів</p>
                      <p className="text-sm text-muted-foreground">
                        Черга, націнки, реклама
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </button>
              )}
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

          {/* Help button for guests */}
          <button 
            onClick={() => setShowCustomerGuide(true)}
            className="w-full flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-xl text-primary hover:bg-primary/20 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Як користуватись Taverna</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <SupplierGuideModal 
        isOpen={showSupplierGuide} 
        onClose={() => setShowSupplierGuide(false)} 
      />
      <CustomerGuideModal 
        isOpen={showCustomerGuide} 
        onClose={() => setShowCustomerGuide(false)} 
      />

      {/* DEV MODE: Role Switcher for testing */}
      {isDevMode && (
        <DevRoleSwitcher 
          currentRole={testRole} 
          onRoleChange={setTestRole} 
        />
      )}
    </div>
  );
};
