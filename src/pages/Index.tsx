import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Shirt, Watch, Footprints, ChevronRight, LogOut } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ProductCard } from "@/components/ProductCard";
import { CategoryCard } from "@/components/CategoryCard";
import { LiveFeedItem } from "@/components/LiveFeedItem";
import { PartnerBanner } from "@/components/PartnerBanner";
import { PromoCard } from "@/components/PromoCard";
import { SearchModal } from "@/components/SearchModal";
import { CartModal } from "@/components/CartModal";
import { AllCategoriesModal } from "@/components/AllCategoriesModal";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { useCartContext } from "@/contexts/CartContext";
import { toast } from "sonner";

// Product images
import tacticalGloves from "@/assets/products/tactical-gloves.jpg";
import tacticalShirt from "@/assets/products/tactical-shirt.jpg";
import tacticalBackpack from "@/assets/products/tactical-backpack.jpg";
import tacticalBoots from "@/assets/products/tactical-boots.jpg";

// Mock data
const categories = [
  { id: "1", name: "Мілітарі", icon: Shield, count: 156, gradient: "from-[#4a5d23] to-[#6b7b3e]" },
  { id: "2", name: "Одяг", icon: Shirt, count: 234, gradient: "from-primary to-primary/70" },
  { id: "3", name: "Аксесуари", icon: Watch, count: 89, gradient: "from-accent to-accent/70" },
  { id: "4", name: "Взуття", icon: Footprints, count: 67, gradient: "from-[#5a4a3a] to-[#7a6a5a]" },
];

const products = [
  {
    id: "1",
    name: "Тактичні рукавички M-Pact чорні",
    price: 890,
    originalPrice: 1200,
    image: tacticalGloves,
    category: "Мілітарі",
    inStock: true,
  },
  {
    id: "2",
    name: "Футболка тактична Coolmax олива",
    price: 650,
    image: tacticalShirt,
    category: "Одяг",
    inStock: true,
  },
  {
    id: "3",
    name: "Рюкзак тактичний 35л мультикам",
    price: 2450,
    originalPrice: 2900,
    image: tacticalBackpack,
    category: "Сумки",
    inStock: true,
  },
  {
    id: "4",
    name: "Берці зимові Gore-Tex чорні",
    price: 4200,
    image: tacticalBoots,
    category: "Взуття",
    inStock: false,
  },
];

const liveFeed = [
  { type: "purchase" as const, username: "Олександр", amount: 2450, productName: "Рюкзак тактичний", timestamp: new Date(Date.now() - 5 * 60000) },
  { type: "registration" as const, username: "Марія", timestamp: new Date(Date.now() - 15 * 60000) },
  { type: "purchase" as const, username: "Дмитро", amount: 890, productName: "Тактичні рукавички", timestamp: new Date(Date.now() - 25 * 60000) },
  { type: "return" as const, username: "Іван", amount: 650, timestamp: new Date(Date.now() - 45 * 60000) },
  { type: "purchase" as const, username: "Анна", amount: 4200, productName: "Берці Gore-Tex", timestamp: new Date(Date.now() - 60 * 60000) },
];

const promos = [
  {
    id: "1",
    title: "Знижка -20% на все",
    description: "Для нових клієнтів при першому замовленні",
    type: "discount" as const,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "2",
    title: "Запроси друга",
    description: "Отримай 100₴ бонусів за кожного запрошеного",
    type: "referral" as const,
  },
  {
    id: "3",
    title: "Flash Sale",
    description: "Знижки до 50% на обрані товари",
    type: "flash" as const,
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
];

// CartItem interface moved to useCart hook

// Tab content components
const CatalogTab = ({ 
  onOpenAllCategories, 
  onProductClick,
  onAddToCart 
}: { 
  onOpenAllCategories: () => void; 
  onProductClick: (id: string) => void;
  onAddToCart: (product: typeof products[0]) => void;
}) => (
  <div className="space-y-6 pb-28 animate-fade-in">
    {/* Categories */}
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground">Категорії</h2>
        <button 
          onClick={onOpenAllCategories}
          className="text-sm text-primary flex items-center gap-1 hover:underline"
        >
          Всі <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            name={cat.name}
            icon={cat.icon}
            count={cat.count}
            gradient={cat.gradient}
            onClick={() => toast.info(`Категорія: ${cat.name}`)}
          />
        ))}
      </div>
    </section>

    {/* Products */}
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground">Популярні товари</h2>
        <button className="text-sm text-primary flex items-center gap-1 hover:underline">
          Всі товари <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            {...product}
            onClick={() => onProductClick(product.id)}
            onAddToCart={() => onAddToCart(product)}
          />
        ))}
      </div>
    </section>
  </div>
);

const OrdersTab = () => (
  <div className="space-y-4 pb-28 animate-fade-in">
    <h2 className="text-lg font-bold text-foreground">Мої Замовлення</h2>
    
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <Shield className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground mb-1">Ще немає замовлень</h3>
      <p className="text-sm text-muted-foreground">
        Ваші замовлення з'являться тут після покупки
      </p>
    </div>
  </div>
);

const NewsTab = () => (
  <div className="space-y-4 pb-28 animate-fade-in">
    <h2 className="text-lg font-bold text-foreground">Новини Taverna</h2>
    
    <div className="space-y-4">
      {[
        { 
          title: "Новий постачальник MyDrop", 
          date: "Сьогодні", 
          content: "Додано нову категорію товарів Military від перевіреного постачальника.",
          type: "info" 
        },
        { 
          title: "Оновлення цін", 
          date: "Вчора", 
          content: "Актуалізовано ціни на понад 100 товарів категорії Мілітарі.",
          type: "update" 
        },
        { 
          title: "Новорічні акції", 
          date: "2 дні тому", 
          content: "Стартували святкові знижки до -30% на весь асортимент!",
          type: "promo" 
        },
      ].map((news, idx) => (
        <div 
          key={idx} 
          className="bg-card rounded-xl p-4 border border-border hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-foreground">{news.title}</h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{news.date}</span>
          </div>
          <p className="text-sm text-muted-foreground">{news.content}</p>
        </div>
      ))}
    </div>
  </div>
);

const LiveTab = () => (
  <div className="space-y-4 pb-28 animate-fade-in">
    <div className="flex items-center gap-2">
      <h2 className="text-lg font-bold text-foreground">Live Активність</h2>
      <span className="w-2 h-2 rounded-full bg-live animate-pulse-live" />
    </div>
    
    <div className="space-y-3">
      {liveFeed.map((item, idx) => (
        <LiveFeedItem key={idx} {...item} />
      ))}
    </div>
  </div>
);

const PromoTab = () => (
  <div className="space-y-4 pb-28 animate-fade-in">
    <h2 className="text-lg font-bold text-foreground">Акції та Бонуси</h2>
    
    <div className="space-y-4">
      {promos.map((promo) => (
        <PromoCard
          key={promo.id}
          {...promo}
          onClick={() => toast.info(`Акція: ${promo.title}`)}
        />
      ))}
    </div>
  </div>
);

const AccountTab = () => {
  const { isAuthenticated, profile, logout } = useTelegramAuthContext();

  const handleLogout = async () => {
    await logout();
    toast.success("Ви вийшли з акаунту");
  };

  const getUserInitials = () => {
    if (profile) {
      const first = profile.first_name?.[0] || '';
      const last = profile.last_name?.[0] || '';
      return (first + last).toUpperCase() || 'U';
    }
    return 'Г';
  };

  const getDisplayName = () => {
    if (profile) {
      const parts = [profile.first_name, profile.last_name].filter(Boolean);
      return parts.join(' ') || profile.telegram_username || 'Користувач';
    }
    return 'Гість';
  };

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      <h2 className="text-lg font-bold text-foreground">Акаунт</h2>
      
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
                {profile?.telegram_username ? `@${profile.telegram_username}` : profile?.phone || 'Авторизовано'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Увійдіть для повного доступу</p>
            )}
          </div>
        </div>
        
        {isAuthenticated ? (
          <button 
            onClick={handleLogout}
            className="w-full mt-4 py-3 bg-destructive/10 text-destructive rounded-lg font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Вийти
          </button>
        ) : (
          <p className="w-full mt-4 py-3 text-center text-sm text-muted-foreground">
            Відкрийте додаток у Telegram для авторизації
          </p>
        )}
      </div>

      {/* Partner Banner */}
      <PartnerBanner onClick={() => window.location.href = "/partner"} />

      {/* Menu Items */}
      <div className="bg-card rounded-xl overflow-hidden border border-border">
        {[
          { label: "Мої дані", icon: "👤" },
          { label: "Адреси доставки", icon: "📍" },
          { label: "Історія замовлень", icon: "📦" },
          { label: "Налаштування", icon: "⚙️" },
          { label: "Підтримка", icon: "💬" },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => toast.info(item.label)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors border-b border-border last:border-b-0"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("catalog");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  
  // Use cart context for synchronized cart
  const { items: cartItems, totalItems, addItem, updateQuantity, removeItem } = useCartContext();

  const handleSearch = (query: string) => {
    setIsSearchOpen(false);
    toast.info(`Пошук: ${query}`);
  };

  const handleUpdateQuantity = async (id: string, quantity: number) => {
    await updateQuantity(id, quantity);
  };

  const handleRemoveItem = async (id: string) => {
    const success = await removeItem(id);
    if (success) {
      toast.success("Товар видалено з кошика");
    }
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    toast.info("Перехід до оформлення замовлення");
  };

  const handleAddToCart = async (product: typeof products[0]) => {
    const success = await addItem(
      product.id,
      product.name,
      product.price,
      product.image
    );
    if (success) {
      toast.success(`${product.name} додано до кошика`);
    }
  };

  const handleProductClick = (id: string) => {
    navigate(`/product/${id}`);
  };

  const handleSelectCategory = (categoryId: string, subcategoryId?: string) => {
    setIsAllCategoriesOpen(false);
    if (subcategoryId) {
      toast.info(`Підкатегорія: ${subcategoryId}`);
    } else {
      toast.info(`Категорія: ${categoryId}`);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "catalog":
        return (
          <CatalogTab 
            onOpenAllCategories={() => setIsAllCategoriesOpen(true)}
            onProductClick={handleProductClick}
            onAddToCart={handleAddToCart}
          />
        );
      case "orders":
        return <OrdersTab />;
      case "news":
        return <NewsTab />;
      case "live":
        return <LiveTab />;
      case "promo":
        return <PromoTab />;
      case "account":
        return <AccountTab />;
      default:
        return (
          <CatalogTab 
            onOpenAllCategories={() => setIsAllCategoriesOpen(true)}
            onProductClick={handleProductClick}
            onAddToCart={handleAddToCart}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartCount={totalItems}
        onCartClick={() => setIsCartOpen(true)}
        onSearchClick={() => setIsSearchOpen(true)}
        onNotificationsClick={() => toast.info("Сповіщення")}
      />
      
      <main className="px-4 py-4">
        {renderTabContent()}
      </main>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={handleSearch}
      />

      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      <AllCategoriesModal
        isOpen={isAllCategoriesOpen}
        onClose={() => setIsAllCategoriesOpen(false)}
        onSelectCategory={handleSelectCategory}
      />
    </div>
  );
};

export default Index;
