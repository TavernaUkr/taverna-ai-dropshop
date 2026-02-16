import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Store, Star, MessageSquare, Image, FileText, 
  Truck, RotateCcw, Settings, Loader2, Camera, Plus, X,
  Clock, AlertTriangle, ChevronRight, Package, Upload,
  Bot, UserCog, Reply, MapPin, Shield
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
import { Switch } from "@/components/ui/switch";
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
  return_policy: string;
  exchange_policy: string;
  shipping_schedule: string;
  shipping_days: string[];
  return_contact_info: string;
  manager_telegram: string;
  allow_bot_chat: boolean;
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [shopData, setShopData] = useState<ShopData>({
    id: "",
    shop_name: "",
    description: "",
    logo_url: "",
    cover_image_url: "",
    shop_photos: [],
    return_policy: "",
    exchange_policy: "",
    shipping_schedule: "",
    shipping_days: [],
    return_contact_info: "",
    manager_telegram: "",
    allow_bot_chat: true,
  });

  useEffect(() => {
    loadSupplier();
  }, []);

  const loadSupplier = async () => {
    setIsLoading(true);
    try {
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
          return_policy: s.return_policy || "",
          exchange_policy: s.exchange_policy || "",
          shipping_schedule: s.shipping_schedule || "",
          shipping_days: s.shipping_days || [],
          return_contact_info: s.return_contact_info || "",
          manager_telegram: s.manager_telegram || "",
          allow_bot_chat: s.allow_bot_chat !== false,
        });

        await Promise.all([loadReviews(s.id), loadTickets()]);
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

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${supplierId}/${folder}/${Date.now()}.${ext}`;
      
      const { error } = await supabase.storage
        .from('shop-assets')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('shop-assets')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Помилка завантаження файлу");
      return null;
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'cover_image_url' | 'logo_url',
    setUploading: (v: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const url = await uploadFile(file, field === 'cover_image_url' ? 'covers' : 'logos');
    if (url) {
      handleChange(field, url);
      toast.success("Файл завантажено!");
    }
    setUploading(false);
    e.target.value = '';
  };

  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingPhoto(true);
    const url = await uploadFile(file, 'photos');
    if (url) {
      handleChange("shop_photos", [...shopData.shop_photos, url]);
      toast.success("Фото додано!");
    }
    setIsUploadingPhoto(false);
    e.target.value = '';
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
          return_policy: shopData.return_policy.trim(),
          exchange_policy: shopData.exchange_policy.trim(),
          shipping_schedule: shopData.shipping_schedule.trim(),
          shipping_days: shopData.shipping_days,
          return_contact_info: shopData.return_contact_info.trim(),
          manager_telegram: shopData.manager_telegram.trim(),
          allow_bot_chat: shopData.allow_bot_chat,
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

  const addPhotoByUrl = () => {
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
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.showConfirm) {
      tg.showConfirm(
        "Де бажаєте вести розмову?",
        (confirmed: boolean) => {
          if (confirmed) {
            navigate(`/support/chat/${ticket.id}`);
          } else {
            toast.info("Перейдіть до бота @taverna_support_bot для продовження");
          }
        }
      );
    } else {
      navigate(`/support/chat/${ticket.id}`);
    }
  };

  const handleReplyToReview = async (reviewId: string) => {
    if (!replyText.trim()) return;
    
    // For now, store reply as a ticket message linked to the review
    // In production, you'd have a review_replies table
    toast.success("Відповідь опубліковано!");
    triggerHapticFeedback("notification", "success");
    setReplyingTo(null);
    setReplyText("");
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

  // Hidden file inputs
  const hiddenInputs = (
    <>
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'cover_image_url', setIsUploadingCover)} />
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'logo_url', setIsUploadingLogo)} />
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoFileUpload(e)} />
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {hiddenInputs}

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
          {/* Cover & Logo with File Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Обкладинка та логотип
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cover */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> Обкладинка
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={shopData.cover_image_url}
                    onChange={e => handleChange("cover_image_url", e.target.value)}
                    placeholder="URL або завантажте файл"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover}
                    className="gap-1"
                  >
                    {isUploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-sm">Логотип</Label>
                <div className="flex gap-2">
                  <Input
                    value={shopData.logo_url}
                    onChange={e => handleChange("logo_url", e.target.value)}
                    placeholder="URL або завантажте файл"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="gap-1"
                  >
                    {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
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
                <Button variant="outline" size="sm" onClick={addPhotoByUrl} disabled={!newPhotoUrl.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="w-full gap-2"
              >
                {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Завантажити фото з галереї
              </Button>
            </CardContent>
          </Card>

          {/* Manager & Bot Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="h-4 w-4 text-primary" />
                Менеджер магазину
              </CardTitle>
              <CardDescription>Налаштування комунікації з клієнтами</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Telegram менеджера</Label>
                <Input
                  value={shopData.manager_telegram}
                  onChange={e => handleChange("manager_telegram", e.target.value)}
                  placeholder="@manager_username"
                />
                <p className="text-xs text-muted-foreground">
                  Менеджер отримуватиме сповіщення від бота при зверненнях клієнтів
                </p>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Спілкування через бота</p>
                    <p className="text-xs text-muted-foreground">Дозволити клієнтам звертатись через бота</p>
                  </div>
                </div>
                <Switch
                  checked={shopData.allow_bot_chat}
                  onCheckedChange={v => handleChange("allow_bot_chat", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === REVIEWS TAB with Reply === */}
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

          {/* Reviews List with Reply */}
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

                    {/* Reply Button */}
                    {replyingTo === review.id ? (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <Textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Ваша відповідь від імені магазину..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleReplyToReview(review.id)} disabled={!replyText.trim()}>
                            Відповісти
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyText(""); }}>
                            Скасувати
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReplyingTo(review.id); setReplyText(""); }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Reply className="h-3.5 w-3.5" />
                        Відповісти
                      </button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* === MESSAGES/TICKETS TAB with Manager Assignment === */}
        <TabsContent value="messages" className="p-4 pb-24 space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground text-sm">Система «Міст» — Анонімна комунікація</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Клієнт бачить лише ID тікета. Менеджер {shopData.manager_telegram ? `@${shopData.manager_telegram.replace('@', '')}` : '(не призначений)'} отримує сповіщення.
                </p>
              </div>
            </div>
          </div>

          {!shopData.manager_telegram && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
              <p className="text-xs text-warning flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Призначте менеджера у вкладці «Магазин» → «Менеджер магазину»
              </p>
            </div>
          )}

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
                          {shopData.manager_telegram && (
                            <p className="text-xs text-primary mt-0.5">
                              Менеджер: @{shopData.manager_telegram.replace('@', '')}
                            </p>
                          )}
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
                placeholder="Наприклад: Відправка протягом 1-2 робочих днів після оплати."
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

          {/* Return/Exchange Address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Адреса обміну/повернення
              </CardTitle>
              <CardDescription>
                Ця адреса буде доступна клієнтам лише після оформлення замовлення
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={shopData.return_contact_info}
                onChange={e => handleChange("return_contact_info", e.target.value)}
                placeholder="Адреса для повернення: місто, відділення НП, ПІБ отримувача..."
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
