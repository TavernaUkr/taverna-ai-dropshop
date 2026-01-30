import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Megaphone,
  Plus,
  Send,
  Clock,
  TrendingUp,
  Target,
  BarChart3,
  Eye,
  MousePointerClick,
  ShoppingCart,
  RefreshCw,
  Wand2,
  Image,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PostingTab } from "@/components/manager/PostingTab";
import { AdvertisingTab } from "@/components/manager/AdvertisingTab";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
}

interface PromotionalPost {
  id: string;
  product: Product | null;
  status: "draft" | "scheduled" | "published";
  aiText: string;
  scheduledAt?: Date;
  platforms: string[];
  type: "posting" | "advertising";
}

const platforms = [
  { id: "telegram", name: "Telegram", icon: "📱" },
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "facebook", name: "Facebook", icon: "👥" },
  { id: "olx", name: "OLX", icon: "🛒" },
  { id: "prom", name: "Prom.ua", icon: "🏪" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "youtube", name: "YouTube", icon: "▶️" },
  { id: "viber", name: "Viber", icon: "💬" },
  { id: "whatsapp", name: "WhatsApp", icon: "📞" },
  { id: "twitter", name: "X (Twitter)", icon: "🐦" },
];

export default function Manager() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("posting");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Generate invite link for new suppliers
  const generateInviteLink = () => {
    const baseUrl = window.location.origin;
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const link = `${baseUrl}/partner?ref=${inviteCode}`;
    setInviteLink(link);
    navigator.clipboard.writeText(link);
    toast.success("Посилання скопійовано!");
  };

  // Mock data for promotional posts
  const [promotionalPosts] = useState<PromotionalPost[]>([
    {
      id: "1",
      product: { id: "1", name: "Тактичні рукавички M-Pact", price: 890, images: [] },
      status: "published",
      aiText: "🧤 Тактичні рукавички M-Pact — надійний захист для ваших рук!",
      platforms: ["telegram", "instagram"],
      type: "posting",
    },
    {
      id: "2",
      product: { id: "2", name: "Рюкзак тактичний 35л", price: 2450, images: [] },
      status: "scheduled",
      aiText: "🎒 Місткий та надійний рюкзак для справжніх тактиків!",
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      platforms: ["telegram", "olx", "prom"],
      type: "advertising",
    },
  ]);

  // Search products
  useEffect(() => {
    if (productSearch.length < 2) {
      setProducts([]);
      return;
    }

    const searchProducts = async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, images")
          .ilike("name", `%${productSearch}%`)
          .limit(10);

        if (!error && data) {
          setProducts(data);
        }
      } catch (err) {
        console.error("Product search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [productSearch]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg text-foreground">Панель партнера</h1>
              <p className="text-xs text-muted-foreground">Постинг та реклама</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={generateInviteLink}>
            <Plus className="h-4 w-4 mr-1" />
            Запросити
          </Button>
        </div>
        {inviteLink && (
          <div className="px-4 pb-3">
            <div className="bg-primary/10 rounded-lg p-2 text-xs text-center">
              <span className="text-muted-foreground">Посилання: </span>
              <span className="text-primary font-mono">{inviteLink}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="posting" className="text-xs">
              <Send className="h-4 w-4 mr-1" />
              Постинг
            </TabsTrigger>
            <TabsTrigger value="advertising" className="text-xs">
              <Megaphone className="h-4 w-4 mr-1" />
              Реклама
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="text-xs">
              <Clock className="h-4 w-4 mr-1" />
              Черга
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">
              <TrendingUp className="h-4 w-4 mr-1" />
              Статистика
            </TabsTrigger>
          </TabsList>

          {/* Posting Tab */}
          <TabsContent value="posting">
            <PostingTab
              products={products}
              isSearching={isSearching}
              productSearch={productSearch}
              setProductSearch={setProductSearch}
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
              setProducts={setProducts}
            />
          </TabsContent>

          {/* Advertising Tab */}
          <TabsContent value="advertising">
            <AdvertisingTab
              products={products}
              isSearching={isSearching}
              productSearch={productSearch}
              setProductSearch={setProductSearch}
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
              setProducts={setProducts}
            />
          </TabsContent>

          {/* Scheduled Posts Tab */}
          <TabsContent value="scheduled" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">У черзі постинга</p>
                    <p className="text-lg font-bold">12</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-xs text-muted-foreground">Активна реклама</p>
                    <p className="text-lg font-bold">3</p>
                  </div>
                </div>
              </Card>
            </div>

            {promotionalPosts
              .filter((p) => p.status === "scheduled")
              .map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{post.product?.name}</p>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              post.type === "posting" 
                                ? "bg-primary/10 text-primary border-primary/20" 
                                : "bg-warning/10 text-warning border-warning/20"
                            )}
                          >
                            {post.type === "posting" ? "Постинг" : "Реклама"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {post.aiText}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {post.scheduledAt?.toLocaleDateString("uk-UA")}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {post.platforms.map((p) => (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {platforms.find((pl) => pl.id === p)?.icon}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

            {promotionalPosts.filter((p) => p.status === "scheduled").length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Немає запланованих публікацій</p>
              </div>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Перегляди</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">1,247</p>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +12% за тиждень
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointerClick className="h-4 w-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Кліки</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">156</p>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +8% за тиждень
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-4 w-4 text-success" />
                    <span className="text-xs text-muted-foreground">Замовлення</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">24</p>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +15% за тиждень
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-warning" />
                    <span className="text-xs text-muted-foreground">Конверсія</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">12.5%</p>
                  <p className="text-xs text-success flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +2.1% за тиждень
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Views Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Динаміка переглядів
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { day: 'Пн', views: 120, clicks: 15 },
                        { day: 'Вт', views: 180, clicks: 22 },
                        { day: 'Ср', views: 250, clicks: 35 },
                        { day: 'Чт', views: 190, clicks: 28 },
                        { day: 'Пт', views: 320, clicks: 45 },
                        { day: 'Сб', views: 280, clicks: 38 },
                        { day: 'Нд', views: 220, clicks: 30 },
                      ]}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="day" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorViews)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Platform Performance */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Ефективність платформ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Telegram', icon: '📱', views: 850, percent: 68 },
                  { name: 'Instagram', icon: '📸', views: 234, percent: 19 },
                  { name: 'OLX', icon: '🛒', views: 98, percent: 8 },
                  { name: 'Prom.ua', icon: '🏪', views: 65, percent: 5 },
                ].map((platform) => (
                  <div key={platform.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{platform.icon}</span>
                        <span className="text-sm font-medium">{platform.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{platform.views} переглядів</span>
                    </div>
                    <Progress value={platform.percent} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Processing Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Статус AI-обробки товарів
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Тактичні рукавички M-Pact', status: 'done', progress: 100 },
                  { name: 'Рюкзак тактичний 35л', status: 'generating', progress: 65 },
                  { name: 'Берці демісезонні', status: 'analyzing', progress: 30 },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex-1 mr-2">{item.name}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs shrink-0",
                          item.status === 'done' && "bg-success/10 text-success border-success/20",
                          item.status === 'generating' && "bg-primary/10 text-primary border-primary/20",
                          item.status === 'analyzing' && "bg-warning/10 text-warning border-warning/20"
                        )}
                      >
                        {item.status === 'done' && 'Готово'}
                        {item.status === 'generating' && 'Генерація опису'}
                        {item.status === 'analyzing' && 'AI аналіз'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={item.progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{item.progress}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Publications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Останні публікації</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {promotionalPosts
                  .filter((p) => p.status === "published")
                  .map((post) => (
                    <div key={post.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Image className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.product?.name}</p>
                        <div className="flex gap-1">
                          {post.platforms.map((p) => (
                            <span key={p} className="text-xs">
                              {platforms.find((pl) => pl.id === p)?.icon}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-success bg-success/10 border-success/20">
                        <Check className="h-3 w-3 mr-1" />
                        Опубліковано
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
