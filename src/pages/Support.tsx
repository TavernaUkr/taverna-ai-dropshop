import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  HelpCircle, 
  MessageCircle, 
  Package, 
  RotateCcw, 
  CreditCard, 
  Truck, 
  ChevronRight,
  Send,
  Wrench,
  ShoppingBag,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCartContext } from "@/contexts/CartContext";
import { useFavoritesContext } from "@/components/FavoritesContext";
import { SearchModal } from "@/components/SearchModal";
import { CartModal } from "@/components/CartModal";
import { WishlistModal } from "@/components/WishlistModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        openTelegramLink: (url: string) => void;
        sendData: (data: string) => void;
        close: () => void;
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

const exchangeSteps = [
  {
    step: 1,
    title: "Зверніться до підтримки",
    description: "Напишіть нам через бот або оберіть 'Питання до постачальника' нижче",
    icon: MessageCircle,
  },
  {
    step: 2,
    title: "Отримайте номер повернення",
    description: "Менеджер надасть вам унікальний номер та адресу для відправки",
    icon: Package,
  },
  {
    step: 3,
    title: "Надішліть товар",
    description: "Запакуйте товар та надішліть Новою Поштою за вказаною адресою",
    icon: Truck,
  },
  {
    step: 4,
    title: "Отримайте заміну або кошти",
    description: "Обмін протягом 3-5 днів, повернення коштів — до 5 робочих днів",
    icon: CheckCircle2,
  },
];

const Support = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("support");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  
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

  const handleOpenSupportModal = () => {
    setIsSupportModalOpen(true);
  };

  const handleSupplierQuery = () => {
    // Query about order/product -> anonymous chat with manager via bot
    const supportData = JSON.stringify({
      type: "supplier_query",
      action: "/support_query",
      category: "order_product",
      timestamp: new Date().toISOString(),
    });

    if (window.Telegram?.WebApp?.sendData) {
      window.Telegram.WebApp.sendData(supportData);
      toast.success("Запит надіслано. Менеджер зв'яжеться з вами.");
    } else {
      // Fallback: open bot with start parameter
      const botUrl = "https://t.me/TavernaBot?start=support_supplier";
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(botUrl);
      } else {
        window.open(botUrl, "_blank");
      }
      toast.success("Відкриваємо чат з менеджером...");
    }
    
    setIsSupportModalOpen(false);
  };

  const handleTechnicalSupport = () => {
    // Technical issue with app -> contact Taverna admin
    const supportData = JSON.stringify({
      type: "technical_support",
      action: "/support_query",
      category: "app_issue",
      timestamp: new Date().toISOString(),
    });

    if (window.Telegram?.WebApp?.sendData) {
      window.Telegram.WebApp.sendData(supportData);
      toast.success("Запит надіслано в технічну підтримку.");
    } else {
      // Fallback: open admin chat
      const adminUrl = "https://t.me/taverna_admin?start=tech_support";
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(adminUrl);
      } else {
        window.open(adminUrl, "_blank");
      }
      toast.success("Відкриваємо чат технічної підтримки...");
    }
    
    setIsSupportModalOpen(false);
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
        onPromoClick={() => navigate("/promos")}
      />
      
      <main className="px-4 py-4 pb-28">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Підтримка</h1>
        </div>

        <Tabs defaultValue="faq" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="exchange">Обмін</TabsTrigger>
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

          {/* Exchange Tab */}
          <TabsContent value="exchange" className="space-y-4">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-4 border border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Обмін товару</h3>
                  <p className="text-xs text-muted-foreground">Протягом 14 днів з моменту отримання</p>
                </div>
              </div>
            </div>

            {/* Step by step guide */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground text-sm">Покрокова інструкція:</h4>
              {exchangeSteps.map((step, index) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={step.step}
                    className="bg-card rounded-xl p-4 border border-border flex gap-4"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {step.step}
                      </div>
                      {index < exchangeSteps.length - 1 && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <IconComponent className="h-4 w-4 text-primary" />
                        <h5 className="font-medium text-foreground text-sm">{step.title}</h5>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Important notes */}
            <div className="bg-warning/10 rounded-xl p-4 border border-warning/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-foreground text-sm mb-1">Важливо!</h5>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Обмін на інший розмір/колір — доставка в обидва боки за рахунок покупця</li>
                    <li>• Обмін на інший товар — різниця в ціні доплачується або повертається</li>
                    <li>• Товар має бути без слідів використання та в оригінальній упаковці</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Returns Tab */}
          <TabsContent value="returns" className="space-y-4">
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Політика повернення</h3>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-4">
                <p>
                  Відповідно до Закону України "Про захист прав споживачів", ви маєте право 
                  повернути або обміняти товар належної якості протягом <strong className="text-foreground">14 днів</strong> з моменту отримання.
                </p>

                <div className="bg-success/10 rounded-xl p-3 border border-success/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <h4 className="font-medium text-foreground text-sm">Умови повернення:</h4>
                  </div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✓ Товар в оригінальній упаковці</li>
                    <li>✓ Відсутні сліди використання</li>
                    <li>✓ Збережено всі бирки та етикетки</li>
                    <li>✓ Наявний чек або підтвердження замовлення</li>
                  </ul>
                </div>

                <div className="bg-destructive/10 rounded-xl p-3 border border-destructive/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <h4 className="font-medium text-foreground text-sm">Не підлягають поверненню:</h4>
                  </div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✗ Натільна білизна та шкарпетки</li>
                    <li>✗ Товари особистої гігієни</li>
                    <li>✗ Ножі та гострі предмети</li>
                    <li>✗ Товари, виготовлені на замовлення</li>
                  </ul>
                </div>

                <div className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h4 className="font-medium text-foreground text-sm">Терміни повернення коштів:</h4>
                  </div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Картка — 3-5 робочих днів</li>
                    <li>• Накладений платіж — до 7 робочих днів</li>
                    <li>• Криптовалюта — до 24 годин</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Contact Support Button */}
        <div className="mt-6">
          <Button 
            onClick={handleOpenSupportModal}
            className="w-full"
            size="lg"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Зв'язатися з підтримкою
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Відповідаємо протягом 15 хвилин у робочий час
          </p>
        </div>
      </main>

      {/* Support Type Selection Modal */}
      <Dialog open={isSupportModalOpen} onOpenChange={setIsSupportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Оберіть тип запиту
            </DialogTitle>
            <DialogDescription>
              Оберіть категорію, щоб ми могли швидше вам допомогти
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {/* Supplier Query - Order/Product issues */}
            <button
              onClick={handleSupplierQuery}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                <ShoppingBag className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">Питання до постачальника</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Замовлення, товари, доставка, обмін, повернення
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            {/* Technical Support - App issues */}
            <button
              onClick={handleTechnicalSupport}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">Технічна підтримка</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Проблеми з додатком, помилки, пропозиції
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>

          {/* Quick contact info */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>Гаряча лінія: +380 (44) 123-45-67</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
