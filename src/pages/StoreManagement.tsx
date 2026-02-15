import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Store, Star, MessageSquare, Image, FileText, 
  Truck, RotateCcw, Settings, Loader2, Camera, Plus, X,
  Clock, AlertTriangle, ChevronRight, Package, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerHapticFeedback, hapticSelection } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const WEEK_DAYS = [
  { id: "mon", label: "Пн" },
  { id: "tue", label: "Вт" },
  { id: "wed", label: "Ср" },
  { id: "thu", label: "Чт" },
  { id: "fri", label: "Пт" },
  { id: "sat", label: "Сб" },
  { id: "sun", label: "Нд" },
];

interface ShopData {
  id: string;
  shop_name: string;
  description: string;
  logo_url: string;
  cover_image_url: string;
  shop_photos: string[];
  contact_phone: string;
  contact_email: string;
  website_url: string;
  telegram_channel_url: string;
  return_policy: string;
  exchange_policy: string;
  shipping_schedule: string;
  shipping_days: string[];
  return_contact_info: string;
}

interface Review {
  id: string;
  author_name: string;
  rating: number;
  content?: string;
  created_at: string;
  is_verified_purchase: boolean;
  product_id: string;
  product?: { name: string };
}

interface SupportTicket {
  id: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  messages_count?: number;
}

export default function StoreManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("shop");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  
  const [shopData, setShopData] = useState<ShopData>({
    id: "",
    shop_name: "",
    description: "",
    logo_url: "",
    cover_image_url: "",
    shop_photos: [],
    contact_phone: "",
    contact_email: "",
    website_url: "",
    telegram_channel_url: "",
    return_policy: "",
    exchange_policy: "",
    shipping_schedule: "",
    shipping_days: [],
    return_contact_info: "",
  });

  useEffect(() => {
    loadSupplier();
  }, []);

  const loadSupplier = async () => {
    setIsLoading(true);
    try {
      // Get first active supplier (in prod: link to user profile)
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .limit(1);

      if (suppliers?.[0]) {
        const s = suppliers[0] as any;
        setSupplierId(s.id);
        setShopData({
          id: s.id,
          shop_name: s.shop_name || "",
          description: s.description || "",
          logo_url: s.logo_url || "",
          cover_image_url: s.cover_image_url || "",
          shop_photos: s.shop_photos || [],
          contact_phone: s.contact_phone || "",
          contact_email: s.contact_email || "",
          website_url: s.website_url || "",
          telegram_channel_url: s.telegram_channel_url || "",
          return_policy: s.return_policy || "",
          exchange_policy: s.exchange_policy || "",
          shipping_schedule: s.shipping_schedule || "",
          shipping_days: s.shipping_days || [],
          return_contact_info: s.return_contact_info || "",
        });

        // Load reviews & tickets in parallel
        await Promise.all([
          loadReviews(s.id),
          loadTickets(),
        ]);
      }
    } catch (err) {
      console.error("Error loading supplier:", err);
      toast.error("Помилка завантаження");
    } finally {
      setIsLoading(false);
    }
  };

  const loadReviews = async (sid: string) => {
    const { data: productIds } = await supabase
      .from("products")
      .select("id")
      .eq("supplier_id", sid);

    if (productIds?.length) {
      const { data } = await supabase
        .from("reviews")
        .select("*, product:products(name)")
        .in("product_id", productIds.map(p => p.id))
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setReviews(data as any);
    }
  };

  const loadTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .in("type", ["supplier_question", "return_request", "exchange_request"])
      .order("updated_at", { ascending: false })
      .limit(30);
    
    if (data) {
      // Get message counts
      const { data: msgs } = await supabase
        .from("ticket_messages")
        .select("ticket_id");
      
      const countMap: Record<string, number> = {};
      (msgs || []).forEach(m => {
        countMap[m.ticket_id] = (countMap[m.ticket_id] || 0) + 1;
      });

      setTickets(data.map(t => ({
        ...t,
        messages_count: countMap[t.id] || 0,
      })));
    }
  };

  const handleSave = async () => {
    if (!supplierId || !shopData.shop_name.trim()) {
      toast.error("Назва магазину обов'язкова");
      return;
    }

    setIsSaving(true);
    triggerHapticFeedback("impact", "light");

    try {
      const { error } = await supabase
        .from("suppliers")
        .update({
          shop_name: shopData.shop_name.trim(),
          description: shopData.description.trim(),
          logo_url: shopData.logo_url.trim(),
          cover_image_url: shopData.cover_image_url.trim(),
          shop_photos: shopData.shop_photos,
          contact_phone: shopData.contact_phone.trim(),
          contact_email: shopData.contact_email.trim(),
          website_url: shopData.website_url.trim(),
          telegram_channel_url: shopData.telegram_channel_url.trim(),
          return_policy: shopData.return_policy.trim(),
          exchange_policy: shopData.exchange_policy.trim(),
          shipping_schedule: shopData.shipping_schedule.trim(),
          shipping_days: shopData.shipping_days,
          return_contact_info: shopData.return_contact_info.trim(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", supplierId);

      if (error) throw error;

      triggerHapticFeedback("notification", "success");
      toast.success("Магазин збережено!");
    } catch (err) {
      console.error("Save error:", err);
      triggerHapticFeedback("notification", "error");
      toast.error("Помилка збереження");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof ShopData, value: any) => {
    setShopData(prev => ({ ...prev, [field]: value }));
  };

  const addPhoto = () => {
    if (newPhotoUrl.trim()) {
      handleChange("shop_photos", [...shopData.shop_photos, newPhotoUrl.trim()]);
      setNewPhotoUrl("");
    }
  };

  const removePhoto = (index: number) => {
    handleChange("shop_photos", shopData.shop_photos.filter((_, i) => i !== index));
  };

  const toggleDay = (dayId: string) => {
    const current = shopData.shipping_days;
    if (current.includes(dayId)) {
      handleChange("shipping_days", current.filter(d => d !== dayId));
    } else {
      handleChange("shipping_days", [...current, dayId]);
    }
  };

  const handleTicketClick = (ticket: SupportTicket) => {
    // Ask where to continue the conversation
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.showConfirm) {
      tg.showConfirm(
        "Де бажаєте вести розмову?",
        (confirmed: boolean) => {
          if (confirmed) {
            // Mini App chat
            navigate(`/support/chat/${ticket.id}`);
          } else {
            // Telegram bot
            toast.info("Перейдіть до бота @taverna_support_bot для продовження");
          }
        }
      );
    } else {
      // Fallback: go to Mini App chat
      navigate(`/support/chat/${ticket.id}`);
    }
  };

  const averageRating = reviews.length 
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length 
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Керування магазином</h1>
            <p className="text-sm text-muted-foreground">{shopData.shop_name || "Мій магазин"}</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Зберегти"}
          </Button>
        </div>
      </div>

      {/* Cover Image Preview */}
      <div className="relative h-36 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 overflow-hidden">
        {shopData.cover_image_url && (
          <img src={shopData.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-3 left-4 flex items-end gap-3">
          <Avatar className="h-16 w-16 border-3 border-background shadow-lg">
            <AvatarImage src={shopData.logo_url} alt={shopData.shop_name} />
            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
              {shopData.shop_name.charAt(0).toUpperCase() || "M"}
            </AvatarFallback>
          </Avatar>
          <div className="pb-1">
            <h2 className="font-bold text-foreground text-lg drop-shadow">{shopData.shop_name || "Мій магазин"}</h2>
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-3.5 w-3.5 text-warning fill-warning" />
              <span className="text-foreground font-medium">{averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground">({reviews.length} відгуків)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { hapticSelection(); setActiveTab(v); }}>
        <TabsList className="w-full grid grid-cols-4 mx-4 mt-3" style={{ width: "calc(100% - 2rem)" }}>
          <TabsTrigger value="shop" className="text-xs gap-1">
            <Store className="h-3.5 w-3.5" />
            Магазин
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs gap-1">
            <Star className="h-3.5 w-3.5" />
            Відгуки
          </TabsTrigger>
          <TabsTrigger value="messages" className="text-xs gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            Запити
          </TabsTrigger>
          <TabsTrigger value="policies" className="text-xs gap-1">
            <FileText className="h-3.5 w-3.5" />
            Правила
          </TabsTrigger>
        </TabsList>

        {/* === SHOP TAB === */}
        <TabsContent value="shop" className="p-4 pb-24 space-y-5">
          {/* Cover & Logo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Обкладинка та логотип
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> URL обкладинки
                </Label>
                <Input
                  value={shopData.cover_image_url}
                  onChange={e => handleChange("cover_image_url", e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">URL логотипу</Label>
                <Input
                  value={shopData.logo_url}
                  onChange={e => handleChange("logo_url", e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>

          {/* Shop Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Інформація</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Назва магазину *</Label>
                <Input
                  value={shopData.shop_name}
                  onChange={e => handleChange("shop_name", e.target.value)}
                  placeholder="Мій магазин"
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Опис магазину</Label>
                <Textarea
                  value={shopData.description}
                  onChange={e => handleChange("description", e.target.value)}
                  placeholder="Розкажіть про ваш магазин, асортимент та переваги..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Shop Photos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Фото магазину
              </CardTitle>
              <CardDescription>Фото вашого магазину, складу або продукції</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {shopData.shop_photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {shopData.shop_photos.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newPhotoUrl}
                  onChange={e => setNewPhotoUrl(e.target.value)}
                  placeholder="URL фото"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addPhoto} disabled={!newPhotoUrl.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Контакти
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Телефон</Label>
                  <Input
                    value={shopData.contact_phone}
                    onChange={e => handleChange("contact_phone", e.target.value)}
                    placeholder="+380..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    value={shopData.contact_email}
                    onChange={e => handleChange("contact_email", e.target.value)}
                    placeholder="shop@example.com"
                  />
                </div>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Вебсайт</Label>
                  <Input
                    value={shopData.website_url}
                    onChange={e => handleChange("website_url", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telegram</Label>
                  <Input
                    value={shopData.telegram_channel_url}
                    onChange={e => handleChange("telegram_channel_url", e.target.value)}
                    placeholder="@myshop"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === REVIEWS TAB === */}
        <TabsContent value="reviews" className="p-4 pb-24 space-y-4">
          {/* Stats */}
          <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{averageRating.toFixed(1)}</div>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn("h-3.5 w-3.5", s <= Math.round(averageRating) ? "text-warning fill-warning" : "text-muted")} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{reviews.length} відгуків</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5,4,3,2,1].map(r => {
                const count = reviews.filter(rv => rv.rating === r).length;
                const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={r} className="flex items-center gap-2">
                    <span className="text-xs w-3">{r}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-warning rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-6">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-2">
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Ще немає відгуків</p>
                </div>
              ) : reviews.map(review => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{review.author_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {review.product?.name && `${review.product.name} • `}
                          {new Date(review.created_at).toLocaleDateString("uk-UA")}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={cn("h-3 w-3", s <= review.rating ? "text-warning fill-warning" : "text-muted")} />
                        ))}
                      </div>
                    </div>
                    {review.content && <p className="text-sm text-muted-foreground">{review.content}</p>}
                    {review.is_verified_purchase && (
                      <Badge variant="secondary" className="mt-2 text-xs">✓ Підтверджена покупка</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* === MESSAGES/TICKETS TAB === */}
        <TabsContent value="messages" className="p-4 pb-24 space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground text-sm">Система «Міст»</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  При новому зверненні ви обираєте де вести розмову: в Mini App або в Telegram-боті. 
                  Клієнт бачить лише ID тікета для конфіденційності.
                </p>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-3 pr-2">
              {tickets.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Немає звернень</p>
                </div>
              ) : tickets.map(ticket => (
                <Card 
                  key={ticket.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleTicketClick(ticket)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          ticket.type === "return_request" ? "bg-destructive/10" :
                          ticket.type === "exchange_request" ? "bg-warning/10" : "bg-primary/10"
                        )}>
                          {ticket.type === "return_request" ? (
                            <RotateCcw className="h-5 w-5 text-destructive" />
                          ) : ticket.type === "exchange_request" ? (
                            <AlertTriangle className="h-5 w-5 text-warning" />
                          ) : (
                            <MessageSquare className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-foreground">
                              {ticket.type === "return_request" ? "Повернення" :
                               ticket.type === "exchange_request" ? "Обмін" : "Запитання"}
                            </p>
                            <Badge variant={ticket.status === "open" ? "default" : "secondary"} className="text-xs">
                              {ticket.status === "open" ? "Відкритий" : "Закритий"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {ticket.messages_count || 0} повідомлень • {new Date(ticket.updated_at).toLocaleDateString("uk-UA")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* === POLICIES TAB === */}
        <TabsContent value="policies" className="p-4 pb-24 space-y-5">
          {/* Shipping Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Графік відправлень
              </CardTitle>
              <CardDescription>Коли ви відправляєте замовлення</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map(day => (
                  <button
                    key={day.id}
                    onClick={() => toggleDay(day.id)}
                    className={cn(
                      "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                      shopData.shipping_days.includes(day.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <Textarea
                value={shopData.shipping_schedule}
                onChange={e => handleChange("shipping_schedule", e.target.value)}
                placeholder="Наприклад: Відправка протягом 1-2 робочих днів після оплати. Відправляємо Новою Поштою та Укрпоштою."
                rows={3}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Return Policy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-primary" />
                Політика повернення
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={shopData.return_policy}
                onChange={e => handleChange("return_policy", e.target.value)}
                placeholder="Опишіть умови повернення: терміни, стан товару, процедура..."
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Exchange Policy */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Правила обміну
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={shopData.exchange_policy}
                onChange={e => handleChange("exchange_policy", e.target.value)}
                placeholder="Опишіть умови обміну товару: розмір, колір, терміни..."
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Return Contact Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Контакт для повернення/обміну
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={shopData.return_contact_info}
                onChange={e => handleChange("return_contact_info", e.target.value)}
                placeholder="Дані для відправки повернення: адреса, ПІБ отримувача, телефон..."
                rows={3}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Save */}
          <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 text-base font-semibold">
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Settings className="h-5 w-5 mr-2" />}
            Зберегти всі правила
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
