import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  HelpCircle, 
  MessageCircle, 
  Package, 
  RotateCcw, 
  CreditCard, 
  Truck, 
  ChevronDown,
  Send,
  ExternalLink
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCartContext } from "@/contexts/CartContext";
import { useFavoritesContext } from "@/components/FavoritesContext";
import { SearchModal } from "@/components/SearchModal";
import { CartModal } from "@/components/CartModal";
import { WishlistModal } from "@/components/WishlistModal";
import { toast } from "sonner";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        openTelegramLink: (url: string) => void;
      };
    };
  }
}

const faqItems = [
  {
    id: "delivery",
    question: "Як здійснюється доставка?",
    answer: "Доставка здійснюється через Нову Пошту по всій Україні. Термін доставки 1-3 робочих дні. Ви можете обрати доставку до відділення або адресну доставку кур'єром.",
    icon: Truck,
  },
  {
    id: "payment",
    question: "Які способи оплати доступні?",
    answer: "Ми приймаємо оплату карткою онлайн, накладеним платежем при отриманні та криптовалютою (USDT). При передоплаті діє знижка 3%.",
    icon: CreditCard,
  },
  {
    id: "returns",
    question: "Як повернути або обміняти товар?",
    answer: "Повернення або обмін можливий протягом 14 днів з моменту отримання. Товар має бути в оригінальній упаковці та без слідів використання. Зверніться до служби підтримки для оформлення повернення.",
    icon: RotateCcw,
  },
  {
    id: "order-status",
    question: "Як відстежити замовлення?",
    answer: "Після відправлення замовлення ви отримаєте номер ТТН Нової Пошти. Відстежити статус можна в розділі 'Замовлення' у вашому профілі або на сайті Нової Пошти.",
    icon: Package,
  },
  {
    id: "warranty",
    question: "Чи є гарантія на товари?",
    answer: "Так, на всі товари надається гарантія від виробника. Термін гарантії залежить від категорії товару та вказаний на сторінці товару.",
    icon: HelpCircle,
  },
];

const returnPolicyText = `
## Загальні умови повернення

Відповідно до Закону України "Про захист прав споживачів", ви маєте право повернути або обміняти товар належної якості протягом 14 днів з моменту отримання.

### Умови повернення:
- Товар має бути в оригінальній упаковці
- Відсутні сліди використання
- Збережено всі бирки та етикетки
- Наявний чек або підтвердження замовлення

### Товари, що не підлягають поверненню:
- Натільна білизна та шкарпетки
- Товари особистої гігієни
- Ножі та гострі предмети (з міркувань безпеки)
- Товари, виготовлені на замовлення

### Процес повернення:
1. Зверніться до служби підтримки
2. Отримайте номер повернення
3. Надішліть товар Новою Поштою
4. Кошти повертаються протягом 3-5 робочих днів

### Обмін товару:
При обміні на інший розмір або колір доставка в обидві сторони за рахунок покупця.
`;

const Support = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("support");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  
  const { items: cartItems, totalItems, updateQuantity, removeItem } = useCartContext();
  const { totalFavorites } = useFavoritesContext();

  const handleTabChange = (tab: string) => {
    if (tab === "catalog") {
      navigate("/");
    } else if (tab === "suppliers") {
      navigate("/suppliers");
    } else if (tab === "support") {
      setActiveTab(tab);
    } else if (tab === "account") {
      navigate("/");
    } else {
      navigate("/");
    }
  };

  const handleSearch = (query: string) => {
    setIsSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleContactAdmin = () => {
    // Open Telegram chat with admin
    const telegramUrl = "https://t.me/taverna_support";
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(telegramUrl);
    } else {
      window.open(telegramUrl, "_blank");
    }
    
    toast.success("Відкриваємо чат підтримки...");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartCount={totalItems}
        favoritesCount={totalFavorites}
        onCartClick={() => setIsCartOpen(true)}
        onSearchClick={() => setIsSearchOpen(true)}
        onNotificationsClick={() => toast.info("Сповіщення")}
        onFavoritesClick={() => setIsWishlistOpen(true)}
      />
      
      <main className="px-4 py-4 pb-28">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Підтримка</h1>
        </div>

        <Tabs defaultValue="faq" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="returns">Повернення</TabsTrigger>
          </TabsList>

          <TabsContent value="faq" className="space-y-4">
            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <AccordionItem
                    key={item.id}
                    value={item.id}
                    className="bg-card rounded-xl border border-border px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pl-11 text-sm text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>

          <TabsContent value="returns" className="space-y-4">
            <div className="bg-card rounded-xl p-4 border border-border prose prose-sm prose-invert max-w-none">
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground m-0">Політика повернення</h3>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-4">
                <p>
                  Відповідно до Закону України "Про захист прав споживачів", ви маєте право 
                  повернути або обміняти товар належної якості протягом <strong className="text-foreground">14 днів</strong> з моменту отримання.
                </p>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Умови повернення:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Товар має бути в оригінальній упаковці</li>
                    <li>Відсутні сліди використання</li>
                    <li>Збережено всі бирки та етикетки</li>
                    <li>Наявний чек або підтвердження замовлення</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Товари, що не підлягають поверненню:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Натільна білизна та шкарпетки</li>
                    <li>Товари особистої гігієни</li>
                    <li>Ножі та гострі предмети</li>
                    <li>Товари, виготовлені на замовлення</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Процес повернення:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Зверніться до служби підтримки</li>
                    <li>Отримайте номер повернення</li>
                    <li>Надішліть товар Новою Поштою</li>
                    <li>Кошти повертаються протягом 3-5 робочих днів</li>
                  </ol>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Contact Admin Button */}
        <div className="mt-6">
          <Button 
            onClick={handleContactAdmin}
            className="w-full"
            size="lg"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Зв'язатися з підтримкою
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Відповідаємо протягом 15 хвилин у робочий час
          </p>
        </div>
      </main>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={handleSearch}
      />

      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onCheckout={() => {
          setIsCartOpen(false);
          navigate("/");
        }}
      />

      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        onProductClick={(id) => {
          setIsWishlistOpen(false);
          navigate(`/product/${id}`);
        }}
      />
    </div>
  );
};

export default Support;
