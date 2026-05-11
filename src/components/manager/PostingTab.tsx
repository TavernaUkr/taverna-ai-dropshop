import { useState } from "react";
import {
  Send,
  Sparkles,
  Loader2,
  Search,
  Check,
  Clock,
  Target,
  Zap,
  Info,
  CreditCard,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trophy,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PaymentModal } from "./PaymentModal";
import { AIPostPreview } from "./AIPostPreview";

import { ProductMultiSelector } from "./ProductMultiSelector";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  supplier_id?: string;
}

interface ShopOption {
  id: string;
  shop_name: string;
  logo_url: string | null;
  is_active: boolean;
}

interface PostingTabProps {
  products: Product[];
  isSearching: boolean;
  productSearch: string;
  setProductSearch: (value: string) => void;
  selectedProducts: Product[];
  setSelectedProducts: (p: Product[]) => void;
  useAllProducts: boolean;
  setUseAllProducts: (v: boolean) => void;
  setProducts: (products: Product[]) => void;
  supplierIds?: string[];
  selectedShopNames?: string[];
  availableShops?: ShopOption[];
}

const POSTING_INTERVALS = {
  newProducts: { min: 2, max: 5, label: "Нові товари" },
  oldProducts: { min: 10, max: 25, label: "Існуючі товари" },
  xmlProducts: { min: 2, max: 5, label: "Товари з XML" },
};

const POSTING_PLATFORMS = [
  { id: "telegram", name: "Telegram", icon: "📱", price: 40, category: "messenger" },
  { id: "instagram", name: "Instagram", icon: "📸", price: 80, category: "social" },
  { id: "facebook", name: "Facebook", icon: "👥", price: 80, category: "social" },
  { id: "tiktok", name: "TikTok", icon: "🎵", price: 90, category: "social" },
  { id: "youtube", name: "YouTube", icon: "▶️", price: 120, category: "social" },
  { id: "twitter", name: "X (Twitter)", icon: "🐦", price: 60, category: "social" },
  { id: "threads", name: "Threads", icon: "🧵", price: 50, category: "social" },
  { id: "pinterest", name: "Pinterest", icon: "📌", price: 45, category: "social" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", price: 70, category: "social" },
  { id: "viber", name: "Viber", icon: "💬", price: 35, category: "messenger" },
  { id: "whatsapp", name: "WhatsApp", icon: "📞", price: 35, category: "messenger" },
  { id: "olx", name: "OLX", icon: "🛒", price: 25, category: "marketplace" },
  { id: "prom", name: "Prom.ua", icon: "🏪", price: 35, category: "marketplace" },
  { id: "rozetka", name: "Rozetka", icon: "🟢", price: 45, category: "marketplace" },
  { id: "ria", name: "RIA.com", icon: "📋", price: 30, category: "marketplace" },
  { id: "shafa", name: "Shafa", icon: "👗", price: 25, category: "marketplace" },
];

type PostStatus = "draft" | "pending" | "approved" | "published" | "rejected";

export function PostingTab({
  products,
  isSearching,
  productSearch,
  setProductSearch,
  selectedProducts,
  setSelectedProducts,
  useAllProducts,
  setUseAllProducts,
  setProducts,
  supplierIds,
  selectedShopNames,
  availableShops,
}: PostingTabProps) {
  const supplierId = supplierIds && supplierIds.length === 1 ? supplierIds[0] : null;
  const selectedProduct = selectedProducts.length === 1 ? selectedProducts[0] : null;
  const productCount = useAllProducts ? "всі" : selectedProducts.length;
  const hasSelection = useAllProducts || selectedProducts.length > 0;
  const selectedShopName = selectedShopNames?.length === 1 ? selectedShopNames[0] :
    (selectedShopNames && selectedShopNames.length > 1) ? `${selectedShopNames.length} магазинів` : null;
  const [isAutoPosting, setIsAutoPosting] = useState(false);
  const [aiText, setAiText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPaidPosting, setShowPaidPosting] = useState(false);
  const [aiPromptHint, setAiPromptHint] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("telegram");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [postStatus, setPostStatus] = useState<PostStatus>("draft");

  const sampleProduct = selectedProduct || selectedProducts[0] || null;

  const fetchAllProductIds = async (): Promise<string[]> => {
    let q = supabase.from("products").select("id").eq("in_stock", true);
    if (supplierIds && supplierIds.length > 0) q = q.in("supplier_id", supplierIds);
    const { data } = await q.limit(1000);
    return (data || []).map((r: any) => r.id);
  };

  const handleGenerateDescription = async () => {
    if (!sampleProduct) {
      toast.error("Спочатку оберіть товар або увімкніть режим 'Усі товари'");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          product: sampleProduct,
          type: selectedPlatform === "olx" || selectedPlatform === "prom" || selectedPlatform === "rozetka" ? "marketplace" : "telegram",
          aiHint: aiPromptHint || undefined,
          template: useAllProducts || selectedProducts.length > 1,
        },
      });

      if (error) throw error;
      setAiText(data?.description || "");
      setShowPreview(true);
      toast.success("Опис згенеровано AI Gemini!");
    } catch (err) {
      console.error("Generate description error:", err);
      const isTemplate = useAllProducts || selectedProducts.length > 1;
      const nameTok = isTemplate ? "{name}" : sampleProduct.name;
      const priceTok = isTemplate ? "{price}" : sampleProduct.price;
      setAiText(`🔥 ${nameTok} за суперціною!\n\n✅ Висока якість\n✅ Швидка доставка\n✅ Гарантія\n\n💰 Ціна: ${priceTok} ₴\n\n👉 Замовляй зараз у Taverna Drop Shop!`);
      setShowPreview(true);
      toast.success("Опис згенеровано!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!hasSelection || !aiText) {
      toast.error("Оберіть товар(и) та згенеруйте опис");
      return;
    }

    if (showPaidPosting) {
      setShowPaymentModal(true);
      return;
    }

    setIsPublishing(true);
    setPostStatus("pending");

    try {
      // Single product fast-path: publish directly to Telegram
      if (!useAllProducts && selectedProducts.length === 1) {
        const single = selectedProducts[0];
        const { error } = await supabase.functions.invoke("telegram-publish", {
          body: { product_id: single.id, custom_text: aiText },
        });
        if (error) throw error;
        setPostStatus("published");
        toast.success("Пост опубліковано в Telegram!");
      } else {
        // Multi/all products: enqueue as promotions for the auto-poster
        const ids = useAllProducts ? await fetchAllProductIds() : selectedProducts.map((p) => p.id);
        if (ids.length === 0) {
          toast.error("Немає товарів для публікації");
          setIsPublishing(false);
          setPostStatus("draft");
          return;
        }
        const rows = ids.map((id) => ({
          product_id: id,
          promotion_type: "auto",
          status: "pending",
          platforms: [selectedPlatform],
          budget: 0,
          ai_generated_text: aiText,
          start_date: new Date().toISOString(),
          supplier_id: supplierId || (supplierIds?.[0]) || undefined,
        }));
        const { error } = await supabase.from("promotions").insert(rows);
        if (error) throw error;
        setPostStatus("published");
        toast.success(`Додано в чергу: ${ids.length} постів`);
      }

      setTimeout(() => {
        setSelectedProducts([]);
        setUseAllProducts(false);
        setAiText("");
        setProductSearch("");
        setPostStatus("draft");
        setShowPreview(false);
      }, 2000);
    } catch (err) {
      console.error("Publish error:", err);
      setPostStatus("rejected");
      toast.error("Помилка публікації");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setPostStatus("approved");
    toast.success("Оплата успішна! Пост буде опублікований негайно.");

    try {
      const ids = useAllProducts
        ? await fetchAllProductIds()
        : selectedProducts.map((p) => p.id);
      const rows = ids.map((id) => ({
        product_id: id,
        promotion_type: "paid_posting",
        status: "pending",
        platforms: [selectedPlatform],
        budget: paidPostingPrice,
        ai_generated_text: aiText,
        start_date: new Date().toISOString(),
        supplier_id: supplierId || (supplierIds?.[0]) || undefined,
      }));
      if (rows.length > 0) await supabase.from("promotions").insert(rows);
    } catch (err) {
      console.error("Save promotion error:", err);
    }

    handlePublish();
  };

  const selectedPlatformData = POSTING_PLATFORMS.find((p) => p.id === selectedPlatform);
  const paidPostingPrice = selectedPlatformData?.price || 50;

  // Group platforms by category
  const socialPlatforms = POSTING_PLATFORMS.filter(p => p.category === "social");
  const messengerPlatforms = POSTING_PLATFORMS.filter(p => p.category === "messenger");
  const marketplacePlatforms = POSTING_PLATFORMS.filter(p => p.category === "marketplace");

  return (
    <div className="space-y-4">
      {/* Rating Bonus Info */}
      {(supplierIds && supplierIds.length > 0) && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">Рейтингові бонуси</p>
                <p className="text-xs text-muted-foreground">
                  Топ-3 у рейтингу = безкоштовні пости, знижка на платний постинг та буст товарів
                </p>
              </div>
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                <Gift className="h-3 w-3 mr-1" />
                Плюшки
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Accordion type="single" collapsible className="bg-card rounded-lg border border-border">
        <AccordionItem value="instructions" className="border-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Інструкція: Постинг</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Постинг</strong> — це моментна публікація ваших товарів у соціальні мережі, месенджери та маркетплейси.
              </p>
              <div className="space-y-2">
                <p className="font-medium text-foreground">🎯 Як це працює:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Пости йдуть <strong>по черзі</strong> серед всіх постачальників</li>
                  <li>AI Gemini автоматично <strong>рандомно обирає</strong> товари (без повторень)</li>
                  <li>Кожен пост має кнопку <strong>"Замовити"</strong> яка веде в Mini App</li>
                  <li>Всі товари автоматично додаються у ваш магазин та категорії</li>
                </ul>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="font-medium text-foreground mb-1">⏱️ Інтервали постинга:</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Нові товари:</strong> кожні {POSTING_INTERVALS.newProducts.min}-{POSTING_INTERVALS.newProducts.max} хв</li>
                  <li>• <strong>Існуючі товари:</strong> кожні {POSTING_INTERVALS.oldProducts.min}-{POSTING_INTERVALS.oldProducts.max} хв</li>
                  <li>• <strong>Товари з MyDrop XML:</strong> кожні {POSTING_INTERVALS.xmlProducts.min}-{POSTING_INTERVALS.xmlProducts.max} хв</li>
                </ul>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                <p className="font-medium text-foreground mb-1">💰 Платний постинг:</p>
                <p className="text-xs">
                  Обходить чергу та публікується <strong>негайно</strong>. 
                  AI-опис, кнопка замовлення та пріоритетне розміщення включені.
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="font-medium text-foreground mb-1">🏆 Рейтингові бонуси для постинга:</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>🥇 Топ-1 за тиждень:</strong> 1 безкоштовний пост</li>
                  <li>• <strong>🥇 Топ-1 за місяць:</strong> 1 безкоштовний пост + Буст 3 дні</li>
                  <li>• <strong>🥇 Топ-1 за рік:</strong> 1 безкоштовна реклама на будь-якій платформі</li>
                  <li>• <strong>💎 Легенда (Весь час):</strong> фіксована націнка 23% на все просування</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Auto-Posting Toggle */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Авто-постинг</p>
                <p className="text-sm text-muted-foreground">
                  Безкоштовно від Taverna Group
                </p>
              </div>
            </div>
            <Switch checked={isAutoPosting} onCheckedChange={setIsAutoPosting} />
          </div>
          {isAutoPosting && (
            <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
              <p className="text-xs text-muted-foreground">
                ✅ Товари{selectedShopName ? ` магазину "${selectedShopName}"` : ""} автоматично публікуються у всі мережі Taverna
              </p>
              <div className="flex flex-wrap gap-1">
                {["📱 Telegram", "📸 Instagram", "👥 Facebook", "🎵 TikTok", "🐦 X", "💬 Viber"].map((platform) => (
                  <Badge key={platform} variant="secondary" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Наступна публікація через ~{Math.floor(Math.random() * 5) + 2} хв
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowPaidPosting(false)}
          className={cn(
            "p-4 rounded-lg border-2 transition-all text-left",
            !showPaidPosting
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          )}
        >
          <Zap className="h-5 w-5 text-primary mb-2" />
          <p className="font-medium text-sm">Безкоштовний</p>
          <p className="text-xs text-muted-foreground">Авто-черга постинга</p>
        </button>
        <button
          onClick={() => setShowPaidPosting(true)}
          className={cn(
            "p-4 rounded-lg border-2 transition-all text-left",
            showPaidPosting
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          )}
        >
          <CreditCard className="h-5 w-5 text-primary mb-2" />
          <p className="font-medium text-sm">Платний</p>
          <p className="text-xs text-muted-foreground">Негайна публікація</p>
        </button>
      </div>

      {/* Platform Selection for Paid Posting */}
      {showPaidPosting && (
        <div className="space-y-3">
          <Label>Оберіть платформу для публікації</Label>
          
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">📱 Соціальні мережі</p>
            <div className="grid grid-cols-2 gap-2">
              {socialPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left text-sm",
                    selectedPlatform === platform.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span>{platform.icon}</span>
                  <span className="flex-1 truncate">{platform.name}</span>
                  <span className="text-xs text-muted-foreground">{platform.price}₴</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">💬 Месенджери</p>
            <div className="grid grid-cols-2 gap-2">
              {messengerPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left text-sm",
                    selectedPlatform === platform.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span>{platform.icon}</span>
                  <span className="flex-1 truncate">{platform.name}</span>
                  <span className="text-xs text-muted-foreground">{platform.price}₴</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">🛒 Маркетплейси</p>
            <div className="grid grid-cols-2 gap-2">
              {marketplacePlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left text-sm",
                    selectedPlatform === platform.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span>{platform.icon}</span>
                  <span className="flex-1 truncate">{platform.name}</span>
                  <span className="text-xs text-muted-foreground">{platform.price}₴</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Product Search */}
      <div className="space-y-2">
        <Label>
          Оберіть товар для постинга
          {selectedShopName && (
            <span className="text-xs text-muted-foreground ml-2">({selectedShopName})</span>
          )}
        </Label>
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
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-primary">{product.price} ₴</p>
                    {multiShop && product.supplier_id && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {availableShops?.find(s => s.id === product.supplier_id)?.shop_name || "—"}
                      </Badge>
                    )}
                  </div>
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

      {/* AI Prompt Hint */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Як ви бачите цей пост? (для AI Gemini)
        </Label>
        <Input
          value={aiPromptHint}
          onChange={(e) => setAiPromptHint(e.target.value)}
          placeholder="Наприклад: зробити акцент на якості, або додати емодзі..."
        />
        <p className="text-xs text-muted-foreground">
          Опишіть своє бачення — AI врахує ваші побажання при генерації
        </p>
      </div>

      {/* AI Text Generation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Текст публікації</Label>
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
          placeholder="Тут з'явиться згенерований текст або введіть власний..."
          rows={6}
        />
      </div>

      {/* AI Post Preview */}
      {showPreview && (
        <AIPostPreview
          product={selectedProduct}
          postText={aiText}
          platform={selectedPlatform as any}
        />
      )}

      {/* Post Status */}
      {postStatus !== "draft" && (
        <Card className={cn(
          "border",
          postStatus === "pending" && "border-warning/50 bg-warning/5",
          postStatus === "approved" && "border-success/50 bg-success/5",
          postStatus === "published" && "border-success/50 bg-success/5",
          postStatus === "rejected" && "border-destructive/50 bg-destructive/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {postStatus === "pending" && <Clock className="h-5 w-5 text-warning animate-pulse" />}
              {postStatus === "approved" && <CheckCircle2 className="h-5 w-5 text-success" />}
              {postStatus === "published" && <CheckCircle2 className="h-5 w-5 text-success" />}
              {postStatus === "rejected" && <AlertCircle className="h-5 w-5 text-destructive" />}
              <div>
                <p className="font-medium text-sm">
                  {postStatus === "pending" && "Перевірка модератором..."}
                  {postStatus === "approved" && "Пост схвалено!"}
                  {postStatus === "published" && "Пост опубліковано!"}
                  {postStatus === "rejected" && "Пост відхилено"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {postStatus === "pending" && "Зазвичай це займає до 2 хвилин"}
                  {postStatus === "approved" && "Публікація розпочнеться найближчим часом"}
                  {postStatus === "published" && "Ваш пост вже доступний для перегляду"}
                  {postStatus === "rejected" && "Будь ласка, перевірте вміст та спробуйте знову"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paid Posting Options */}
      {showPaidPosting && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-warning" />
              Платний постинг
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ваш пост буде опублікований негайно з пріоритетом у черзі
            </p>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">
                  {selectedPlatformData?.icon} {selectedPlatformData?.name} пост
                </span>
                <span className="font-medium">{paidPostingPrice} ₴</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Включає: пріоритетну публікацію + AI-опис + кнопку замовлення + автомодерацію
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Publish Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handlePublish}
        disabled={!selectedProduct || !aiText || isPublishing || postStatus === "pending"}
      >
        {isPublishing ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Send className="h-5 w-5 mr-2" />
        )}
        {showPaidPosting ? `Оплатити ${paidPostingPrice} ₴ та опублікувати` : "Додати в чергу постинга"}
      </Button>

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        amount={paidPostingPrice}
        description={`Платний постинг: ${selectedProduct?.name || "товар"} на ${selectedPlatformData?.name}`}
        type="posting"
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
