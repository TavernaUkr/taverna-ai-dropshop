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
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
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
import { PaymentModal } from "./PaymentModal";
import { AIPostPreview } from "./AIPostPreview";
import { PlatformConditions } from "./PlatformConditions";

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
    apiStatus: "connected" as const,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    minBudget: 200,
    reach: "15K-80K",
    cpm: 25,
    features: ["Stories & Reels", "Візуальний контент", "Шопінг теги"],
    apiStatus: "pending" as const,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "👥",
    minBudget: 200,
    reach: "20K-100K",
    cpm: 20,
    features: ["Широка аудиторія", "Ретаргетинг", "Детальний таргетинг"],
    apiStatus: "pending" as const,
  },
  {
    id: "olx",
    name: "OLX",
    icon: "🛒",
    minBudget: 50,
    reach: "5K-30K",
    cpm: 10,
    features: ["Топ оголошення", "Підняття в пошуку", "VIP статус"],
    apiStatus: "pending" as const,
  },
  {
    id: "prom",
    name: "Prom.ua",
    icon: "🏪",
    minBudget: 100,
    reach: "8K-40K",
    cpm: 18,
    features: ["Топ у категорії", "Рекомендації", "Бейджі"],
    apiStatus: "pending" as const,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    minBudget: 300,
    reach: "50K-200K",
    cpm: 12,
    features: ["Вірусний потенціал", "Молода аудиторія", "Тренди"],
    apiStatus: "pending" as const,
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
    minBudget: 500,
    reach: "30K-150K",
    cpm: 35,
    features: ["Відео реклама", "Детальна аналітика", "Скіпабельні оголошення"],
    apiStatus: "pending" as const,
  },
  {
    id: "google",
    name: "Google Ads",
    icon: "🔍",
    minBudget: 200,
    reach: "Необмежений",
    cpm: 30,
    features: ["Пошукова реклама", "Контекстний таргетинг", "Ремаркетинг"],
    apiStatus: "pending" as const,
  },
];

// Tiered ad markup based on budget
function getAdMarkupPercent(budget: number): number {
  if (budget >= 10000) return 23;
  if (budget >= 2000) return 28;
  if (budget >= 500) return 33;
  return 40;
}

// Multi-platform discount on markup
function getMultiPlatformDiscount(platformCount: number, budget: number): number {
  if (platformCount <= 1) return 0;
  if (budget >= 10000) return 3;
  if (budget >= 2000) return platformCount >= 3 ? 5 : 3;
  if (budget >= 500) {
    if (platformCount >= 4) return 8;
    if (platformCount >= 3) return 6;
    return 3;
  }
  // < 500
  if (platformCount >= 3) return 8;
  if (platformCount >= 2) return 5;
  return 0;
}

function calculateAdMarkup(budget: number, platformCount: number): number {
  const baseMarkup = getAdMarkupPercent(budget);
  const discount = getMultiPlatformDiscount(platformCount, budget);
  return Math.max(baseMarkup - discount, 15); // floor at 15%
}

type AdStatus = "draft" | "pending_review" | "approved" | "active" | "rejected" | "completed";

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [adStatus, setAdStatus] = useState<AdStatus>("draft");

  const togglePlatform = (platformId: string) => {
    const platform = AD_PLATFORMS.find((p) => p.id === platformId);
    if (platform?.apiStatus === "pending") {
      toast.info(`API ${platform.name} буде підключено найближчим часом`);
    }
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
      setShowPreview(true);
      toast.success("Рекламний текст згенеровано!");
    } catch (err) {
      console.error("Generate description error:", err);
      setAiText(`🔥 ${selectedProduct.name}\n\n✨ Преміум якість за найкращою ціною!\n💰 Всього ${selectedProduct.price} ₴\n\n🚀 Швидка доставка по Україні\n✅ Гарантія якості\n\n👉 Замовляй зараз!`);
      setShowPreview(true);
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
    if (!aiText) {
      toast.error("Згенеруйте або введіть рекламний текст");
      return;
    }

    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    setAdStatus("pending_review");
    toast.success("Оплата успішна! Рекламу передано на модерацію.");
    
    // Save campaign to database
    try {
      const { error } = await supabase.from("promotions").insert({
        product_id: selectedProduct?.id,
        promotion_type: "paid_advertising",
        status: "pending",
        platforms: selectedPlatforms,
        budget: budget,
        ai_generated_text: aiText,
        start_date: new Date().toISOString(),
      });

      if (error) {
        console.error("Failed to save promotion:", error);
      }
    } catch (err) {
      console.error("Save promotion error:", err);
    }
    
    // Simulate moderation process
    setTimeout(() => {
      setAdStatus("approved");
      toast.success("Рекламу схвалено! Запуск кампанії...");
      
      setTimeout(() => {
        setAdStatus("active");
        toast.success("Рекламна кампанія активна!");
      }, 2000);
    }, 3000);
  };

  const totalCost = calculateTotalCost();

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
                  <li>• AI-генерація рекламного тексту (Gemini)</li>
                  <li>• Автоматична модерація контенту</li>
                  <li>• Таргетинг на вашу аудиторію</li>
                  <li>• Детальна статистика та звіти</li>
                  <li>• Перевірка ефективності реклами</li>
                </ul>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                <p className="font-medium text-foreground mb-1">⚠️ Модерація:</p>
                <p className="text-xs">
                  Кожна реклама проходить автоматичну перевірку перед публікацією.
                  Час модерації залежить від платформи (від 30 хв до 24 год).
                </p>
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
            <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
              <p className="text-xs text-muted-foreground">
                ✅ Ваші товари автоматично рекламуються на всіх платформах Taverna по черзі
              </p>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Наступна реклама через ~{Math.floor(Math.random() * 20) + 10} хв
                </span>
              </div>
            </div>
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedProduct(null);
                setProductSearch("");
                setAiText("");
                setShowPreview(false);
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Platform Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Оберіть платформи для реклами</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConditions(!showConditions)}
            disabled={selectedPlatforms.length === 0}
          >
            <Info className="h-4 w-4 mr-1" />
            Умови
          </Button>
        </div>
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
                  {platform.apiStatus === "connected" ? (
                    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      API
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                      <Clock className="h-3 w-3 mr-1" />
                      Скоро
                    </Badge>
                  )}
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

      {/* Platform Conditions */}
      {showConditions && selectedPlatforms.length > 0 && (
        <PlatformConditions selectedPlatforms={selectedPlatforms} />
      )}

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
          <p className="text-xs text-muted-foreground">
            Мінімальний бюджет для обраних платформ: {Math.max(...selectedPlatforms.map(id => 
              AD_PLATFORMS.find(p => p.id === id)?.minBudget || 50
            ))} ₴
          </p>
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!aiText}
            >
              <Eye className="h-4 w-4 mr-1" />
              Перегляд
            </Button>
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
        </div>
        <Textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          placeholder="AI згенерує оптимальний рекламний текст для обраних платформ..."
          rows={5}
        />
      </div>

      {/* AI Post Preview */}
      {showPreview && (
        <AIPostPreview
          product={selectedProduct}
          postText={aiText}
          platform={(selectedPlatforms[0] || "telegram") as any}
        />
      )}

      {/* Ad Status */}
      {adStatus !== "draft" && (
        <Card className={cn(
          "border",
          adStatus === "pending_review" && "border-warning/50 bg-warning/5",
          adStatus === "approved" && "border-success/50 bg-success/5",
          adStatus === "active" && "border-success/50 bg-success/5",
          adStatus === "rejected" && "border-destructive/50 bg-destructive/5",
          adStatus === "completed" && "border-muted bg-muted/50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {adStatus === "pending_review" && <Clock className="h-5 w-5 text-warning animate-pulse" />}
              {adStatus === "approved" && <ShieldCheck className="h-5 w-5 text-success" />}
              {adStatus === "active" && <TrendingUp className="h-5 w-5 text-success animate-pulse" />}
              {adStatus === "rejected" && <AlertCircle className="h-5 w-5 text-destructive" />}
              {adStatus === "completed" && <CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {adStatus === "pending_review" && "Модерація рекламного контенту..."}
                  {adStatus === "approved" && "Рекламу схвалено!"}
                  {adStatus === "active" && "Рекламна кампанія активна"}
                  {adStatus === "rejected" && "Рекламу відхилено"}
                  {adStatus === "completed" && "Кампанію завершено"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {adStatus === "pending_review" && "Перевірка на відповідність правилам платформ"}
                  {adStatus === "approved" && "Запуск кампанії розпочнеться найближчим часом"}
                  {adStatus === "active" && "Відстежуйте статистику в розділі 'Статистика'"}
                  {adStatus === "rejected" && "Будь ласка, перевірте вміст та спробуйте знову"}
                  {adStatus === "completed" && "Переглянути звіт можна в розділі 'Статистика'"}
                </p>
              </div>
            </div>
            {adStatus === "active" && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold">1,247</p>
                  <p className="text-xs text-muted-foreground">Перегляди</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold">156</p>
                  <p className="text-xs text-muted-foreground">Кліки</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-lg font-bold">12.5%</p>
                  <p className="text-xs text-muted-foreground">CTR</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cost Summary */}
      {selectedPlatforms.length > 0 && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Загальна вартість:</span>
              <span className="text-xl font-bold text-success">{totalCost} ₴</span>
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
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Оберіть спосіб оплати:</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmitAd}
        disabled={
          !selectedProduct || 
          selectedPlatforms.length === 0 || 
          !aiText || 
          adStatus === "pending_review" || 
          adStatus === "active"
        }
      >
        {adStatus === "pending_review" ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Megaphone className="h-5 w-5 mr-2" />
        )}
        {adStatus === "pending_review" 
          ? "Модерація..." 
          : `Оплатити ${totalCost} ₴ та запустити рекламу`
        }
      </Button>

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        amount={totalCost}
        description={`Рекламна кампанія: ${selectedProduct?.name || "товар"} на ${selectedPlatforms.length} платформах`}
        type="advertising"
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
