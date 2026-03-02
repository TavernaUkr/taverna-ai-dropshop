import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, MessageSquare, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { SupplierOrders } from "@/components/supplier/SupplierOrders";
import { hapticSelection } from "@/lib/haptics";

export default function SupplierStoreOrders() {
  const navigate = useNavigate();
  const { profile } = useTelegramAuth();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");

  useEffect(() => {
    const findSupplier = async () => {
      setIsLoading(true);
      try {
        if (profile?.telegram_id) {
          const { data } = await supabase
            .from("suppliers")
            .select("id")
            .eq("telegram_id", profile.telegram_id)
            .limit(1);
          setSupplierId(data?.[0]?.id || null);
        }
      } catch (err) {
        console.error("Error finding supplier:", err);
      } finally {
        setIsLoading(false);
      }
    };
    findSupplier();
  }, [profile?.telegram_id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!supplierId) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Назад
        </Button>
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Магазин не знайдено</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { hapticSelection(); navigate(-1); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg text-foreground">Замовлення магазину</h1>
              <p className="text-xs text-muted-foreground">Керуйте замовленнями та спілкуйтесь з клієнтами</p>
            </div>
          </div>
          {/* AI Chat indicator */}
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 h-11">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Замовлення
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Чат з клієнтами
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            <SupplierOrders supplierId={supplierId} />
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Bot className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI-асистент Taverna</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Чат-бот на базі Gemini AI допомагає вам спілкуватись з клієнтами через анонімний Міст.
                  Клієнти пишуть через бота — ви відповідаєте тут або в Telegram.
                </p>
              </div>
              <Button 
                onClick={() => { hapticSelection(); navigate("/support"); }}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Відкрити чати підтримки
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
