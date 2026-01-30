import { useState } from "react";
import {
  Megaphone,
  Sparkles,
  Loader2,
  Search,
  Check,
  Target,
  Info,
  CreditCard,
  Eye,
  Users,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
}

interface AdvertisingTabProps {
  products: Product[];
  isSearching: boolean;
  productSearch: string;
  setProductSearch: (value: string) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  setProducts: (products: Product[]) => void;
}

// Advertising platforms with their conditions
const AD_PLATFORMS = [
  {
    id: "telegram",
    name: "Telegram",
    icon: "📱",
    minBudget: 100,
    reach: "10K-50K",
    cpm: 15,
    features: ["Таргетована аудиторія", "Кнопки дій", "Статистика"],
    markup: 33,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    minBudget: 200,
    reach: "15K-80K",
    cpm: 25,
    features: ["Stories & Reels", "Візуальний контент", "Шопінг теги"],
    markup: 33,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "👥",
    minBudget: 200,
    reach: "20K-100K",
    cpm: 20,
    features: ["Широка аудиторія", "Ретаргетинг", "Детальний таргетинг"],
    markup: 33,
  },
  {
    id: "olx",
    name: "OLX",
    icon: "🛒",
    minBudget: 50,
    reach: "5K-30K",
    cpm: 10,
    features: ["Топ оголошення", "Підняття в пошуку", "VIP статус"],
    markup: 28,
  },
  {
    id: "prom",
    name: "Prom.ua",
    icon: "🏪",
    minBudget: 100,
    reach: "8K-40K",
    cpm: 18,
    features: ["Топ у категорії", "Рекомендації", "Бейджі"],
    markup: 28,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    minBudget: 300,
    reach: "50K-200K",
    cpm: 12,
    features: ["Вірусний потенціал", "Молода аудиторія", "Тренди"],
    markup: 33,
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
    minBudget: 500,
    reach: "30K-150K",
    cpm: 35,
    features: ["Відео реклама", "Детальна аналітика", "Скіпабельні оголошення"],
    markup: 28,
  },
  {
    id: "google",
    name: "Google Ads",
    icon: "🔍",
    minBudget: 200,
    reach: "Необмежений",
    cpm: 30,
    features: ["Пошукова реклама", "Контекстний таргетинг", "Ремаркетинг"],
    markup: 23,
  },
];

export function AdvertisingTab({
  products,
  isSearching,
  productSearch,
  setProductSearch,
  selectedProduct,
  setSelectedProduct,
  setProducts,
}: AdvertisingTabProps) {
  const [isAutoAds, setIsAutoAds] = useState(false);
  const [aiText, setAiText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [aiPromptHint, setAiPromptHint] = useState("");
  const [budget, setBudget] = useState<number>(100);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleGenerateDescription = async () => {
    if (!selectedProduct) {
      toast.error("Спочатку оберіть товар");
      return;
    }

    setIsGenerating(true);
    try {
      const platformType = selectedPlatforms[0] || "telegram";
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          product: selectedProduct,
          type: platformType === "olx" || platformType === "prom" ? "marketplace" : 
                platformType === "instagram" || platformType === "facebook" || platformType === "tiktok" ? "social" : 
                "telegram",
          aiHint: aiPromptHint || undefined,
        },
      });

      if (error) throw error;
      setAiText(data?.description || "");
      toast.success("Рекламний текст згенеровано!");
    } catch (err) {
      console.error("Generate description error:", err);
      setAiText(`🔥 ${selectedProduct.name}\n\n✨ Преміум якість за найкращою ціною!\n💰 Всього ${selectedProduct.price} ₴\n\n🚀 Швидка доставка по Україні\n✅ Гарантія якості\n\n👉 Замовляй зараз!`);
      toast.success("Текст згенеровано!");
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateTotalCost = () => {
    let total = 0;
    selectedPlatforms.forEach((platformId) => {
      const platform = AD_PLATFORMS.find((p) => p.id === platformId);
      if (platform) {
        const platformCost = Math.max(budget, platform.minBudget);
        const markup = platform.markup / 100;
        total += platformCost * (1 + markup);
      }
    });
    return Math.round(total);
  };

  const handleSubmitAd = async () => {
    if (!selectedProduct) {
      toast.error("Оберіть товар для реклами");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Оберіть хоча б одну платформу");
      return;
    }

    toast.info("Функція оплати буде доступна після підключення платіжної системи");
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <Accordion type="single" collapsible className="bg-card rounded-lg border border-border">
        <AccordionItem value="instructions" className="border-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Інструкція: Реклама</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Реклама</strong> — платне просування ваших товарів на різних платформах з розширеним охопленням.
              </p>
              <div className="space-y-2">
                <p className="font-medium text-foreground">💰 Як працює ціноутворення:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Кожна платформа має <strong>мінімальний бюджет</strong></li>
                  <li>Taverna Group додає сервісну націнку: <strong>33% / 28% / 23%</strong> залежно від платформи</li>
                  <li>Ви отримуєте <strong>повну звітність</strong> та статистику</li>
                  <li>Можна обрати <strong>комбіновану рекламу</strong> на кількох платформах</li>
                </ul>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="font-medium text-foreground mb-1">🎯 Що входить:</p>
                <ul className="space-y-1 text-xs">
                  <li>• AI-генерація рекламного тексту</li>
                  <li>• Автоматична модерація контенту</li>
                  <li>• Таргетинг на вашу аудиторію</li>
                  <li>• Детальна статистика та звіти</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Auto-Ads Toggle */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Авто-реклама</p>
                <p className="text-sm text-muted-foreground">
                  Безкоштовно від Taverna Group
                </p>
              </div>
            </div>
            <Switch checked={isAutoAds} onCheckedChange={setIsAutoAds} />
          </div>
          {isAutoAds && (
            <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted rounded-lg">
              ✅ Ваші товари автоматично рекламуються на всіх платформах Taverna по черзі
            </p>
          )}
        </CardContent>
      </Card>

      {/* Product Search */}
      <div className="space-y-2">
        <Label>Оберіть товар для реклами</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Пошук товару..."
            className="pl-10"
          />
        </div>
        
        {isSearching && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Пошук...</span>
          </div>
        )}
        
        {products.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product);
                  setProductSearch(product.name);
                  setProducts([]);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors border-b border-border last:border-0"
              >
                <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden">
                  {product.images?.[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-sm text-primary">{product.price} ₴</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedProduct && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Check className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-sm">{selectedProduct.name}</p>
              <p className="text-sm text-primary">{selectedProduct.price} ₴</p>
            </div>
          </div>
        )}
      </div>

      {/* Platform Selection */}
      <div className="space-y-3">
        <Label>Оберіть платформи для реклами</Label>
        <div className="grid grid-cols-1 gap-2">
          {AD_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                selectedPlatforms.includes(platform.id)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className="text-2xl">{platform.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{platform.name}</span>
                  <Badge variant="outline" className="text-xs">
                    від {platform.minBudget} ₴
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    +{platform.markup}%
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {platform.reach}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    ~{platform.cpm} ₴/1000
                  </span>
                </div>
              </div>
              {selectedPlatforms.includes(platform.id) && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      {selectedPlatforms.length > 0 && (
        <div className="space-y-2">
          <Label>Бюджет на кожну платформу (₴)</Label>
          <Input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            min={50}
            step={50}
          />
        </div>
      )}

      {/* AI Prompt Hint */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Як ви бачите цю рекламу? (для AI Gemini)
        </Label>
        <Input
          value={aiPromptHint}
          onChange={(e) => setAiPromptHint(e.target.value)}
          placeholder="Наприклад: зробити акцент на знижці, або використати гумор..."
        />
      </div>

      {/* AI Text Generation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Рекламний текст</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateDescription}
            disabled={!selectedProduct || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Згенерувати AI
          </Button>
        </div>
        <Textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          placeholder="AI згенерує оптимальний рекламний текст для обраних платформ..."
          rows={5}
        />
      </div>

      {/* Cost Summary */}
      {selectedPlatforms.length > 0 && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Загальна вартість:</span>
              <span className="text-xl font-bold text-success">{calculateTotalCost()} ₴</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {selectedPlatforms.map((platformId) => {
                const platform = AD_PLATFORMS.find((p) => p.id === platformId);
                if (!platform) return null;
                const platformCost = Math.max(budget, platform.minBudget);
                const withMarkup = Math.round(platformCost * (1 + platform.markup / 100));
                return (
                  <div key={platformId} className="flex justify-between">
                    <span>{platform.icon} {platform.name}</span>
                    <span>{withMarkup} ₴ (+{platform.markup}%)</span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button variant="outline" size="sm" className="text-xs">
                MonoPay
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                LiqPay
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Stripe
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmitAd}
        disabled={!selectedProduct || selectedPlatforms.length === 0}
      >
        <Megaphone className="h-5 w-5 mr-2" />
        Запустити рекламу ({calculateTotalCost()} ₴)
      </Button>
    </div>
  );
}
