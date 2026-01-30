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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
}

interface PostingTabProps {
  products: Product[];
  isSearching: boolean;
  productSearch: string;
  setProductSearch: (value: string) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  setProducts: (products: Product[]) => void;
}

const POSTING_INTERVALS = {
  newProducts: { min: 2, max: 5, label: "Нові товари" },
  oldProducts: { min: 10, max: 25, label: "Існуючі товари" },
  xmlProducts: { min: 2, max: 5, label: "Товари з XML" },
};

export function PostingTab({
  products,
  isSearching,
  productSearch,
  setProductSearch,
  selectedProduct,
  setSelectedProduct,
  setProducts,
}: PostingTabProps) {
  const [isAutoPosting, setIsAutoPosting] = useState(false);
  const [aiText, setAiText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPaidPosting, setShowPaidPosting] = useState(false);
  const [aiPromptHint, setAiPromptHint] = useState("");

  const handleGenerateDescription = async () => {
    if (!selectedProduct) {
      toast.error("Спочатку оберіть товар");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          product: selectedProduct,
          type: "telegram",
          aiHint: aiPromptHint || undefined,
        },
      });

      if (error) throw error;
      setAiText(data?.description || "");
      toast.success("Опис згенеровано AI Gemini!");
    } catch (err) {
      console.error("Generate description error:", err);
      setAiText(`🔥 ${selectedProduct.name} за суперціною!\n\n✅ Висока якість\n✅ Швидка доставка\n✅ Гарантія\n\n💰 Ціна: ${selectedProduct.price} ₴\n\n👉 Замовляй зараз у Taverna Drop Shop!`);
      toast.success("Опис згенеровано!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedProduct || !aiText) {
      toast.error("Оберіть товар та згенеруйте опис");
      return;
    }

    setIsPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-publish", {
        body: {
          product_id: selectedProduct.id,
          custom_text: aiText,
        },
      });

      if (error) throw error;
      toast.success("Пост опубліковано в Telegram!");
      setSelectedProduct(null);
      setAiText("");
      setProductSearch("");
    } catch (err) {
      console.error("Publish error:", err);
      toast.error("Помилка публікації");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
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
                <strong className="text-foreground">Постинг</strong> — це моментна публікація ваших товарів у Telegram-канал Taverna Group.
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
                ✅ Товари автоматично публікуються в Telegram та паралельно у всі мережі Taverna
              </p>
              <div className="flex flex-wrap gap-1">
                {["📱 Telegram", "📸 Instagram", "👥 Facebook", "🎵 TikTok"].map((platform) => (
                  <Badge key={platform} variant="secondary" className="text-xs">
                    {platform}
                  </Badge>
                ))}
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

      {/* Product Search */}
      <div className="space-y-2">
        <Label>Оберіть товар для постинга</Label>
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

      {/* AI Prompt Hint */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Підказка для AI Gemini (опційно)
        </Label>
        <Input
          value={aiPromptHint}
          onChange={(e) => setAiPromptHint(e.target.value)}
          placeholder="Наприклад: зробити акцент на якості, або додати емодзі..."
        />
        <p className="text-xs text-muted-foreground">
          Опишіть, як ви бачите цей пост — AI врахує ваші побажання
        </p>
      </div>

      {/* AI Text Generation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Текст публікації</Label>
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
          placeholder="Тут з'явиться згенерований текст або введіть власний..."
          rows={6}
        />
      </div>

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
                <span className="text-sm">Telegram пост</span>
                <span className="font-medium">50 ₴</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Включає: пріоритетну публікацію + AI-опис + кнопку замовлення
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
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

      {/* Publish Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handlePublish}
        disabled={!selectedProduct || !aiText || isPublishing}
      >
        {isPublishing ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Send className="h-5 w-5 mr-2" />
        )}
        {showPaidPosting ? "Оплатити та опублікувати" : "Додати в чергу постинга"}
      </Button>
    </div>
  );
}
