import { useState, useEffect } from "react";
import { Scale, MessageSquare, Loader2, Check, X, AlertTriangle, Package, User, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hapticNotification } from "@/lib/haptics";

interface Dispute {
  id: string;
  ticket_id: string;
  order_id: string;
  customer_name: string;
  supplier_name: string;
  reason: string;
  description: string;
  status: "pending" | "in_review" | "resolved_customer" | "resolved_supplier" | "rejected";
  created_at: string;
  order_amount: number;
  last_message: string | null;
}

export function DisputesManager() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [resolutionType, setResolutionType] = useState<string>("");
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setIsLoading(true);
    try {
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select(`*, order:orders(id, order_number, total, profile_id)`)
        .eq("type", "supplier_question")
        .in("status", ["open"])
        .not("related_order_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch customer names from profiles_safe
      const profileIds = [...new Set((tickets || []).map(t => t.user_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_safe" as any)
          .select("id, first_name, last_name")
          .in("id", profileIds);
        (profiles || []).forEach((p: any) => {
          profileMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Клієнт";
        });
      }

      // Fetch order items to find supplier
      const orderIds = [...new Set((tickets || []).map(t => t.related_order_id).filter(Boolean))];
      let supplierMap: Record<string, string> = {};
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("order_id, product_id")
          .in("order_id", orderIds);
        
        const productIds = [...new Set((orderItems || []).map(oi => oi.product_id).filter(Boolean))];
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, supplier_id")
            .in("id", productIds);
          
          const supplierIds = [...new Set((products || []).map(p => p.supplier_id).filter(Boolean))];
          if (supplierIds.length > 0) {
            const { data: suppliers } = await supabase
              .from("suppliers")
              .select("id, shop_name")
              .in("id", supplierIds as string[]);
            
            const supplierNameMap: Record<string, string> = {};
            (suppliers || []).forEach(s => { supplierNameMap[s.id] = s.shop_name; });
            
            (orderItems || []).forEach(oi => {
              const product = (products || []).find(p => p.id === oi.product_id);
              if (product?.supplier_id && oi.order_id) {
                supplierMap[oi.order_id] = supplierNameMap[product.supplier_id] || "Постачальник";
              }
            });
          }
        }
      }

      // Fetch last messages for each ticket
      const ticketIds = (tickets || []).map(t => t.id);
      let lastMessageMap: Record<string, string> = {};
      if (ticketIds.length > 0) {
        const { data: messages } = await supabase
          .from("ticket_messages")
          .select("ticket_id, message_text")
          .in("ticket_id", ticketIds)
          .order("created_at", { ascending: false });
        
        (messages || []).forEach(m => {
          if (!lastMessageMap[m.ticket_id]) {
            lastMessageMap[m.ticket_id] = m.message_text;
          }
        });
      }

      const disputesData: Dispute[] = (tickets || []).map((t) => ({
        id: t.id,
        ticket_id: t.id,
        order_id: t.related_order_id || "",
        customer_name: profileMap[t.user_id] || "Клієнт",
        supplier_name: supplierMap[t.related_order_id || ""] || "Постачальник",
        reason: "Спір по замовленню",
        description: lastMessageMap[t.id] || "Спірне питання щодо замовлення",
        status: "pending" as const,
        created_at: t.created_at,
        order_amount: t.order?.total || 0,
        last_message: lastMessageMap[t.id] || null,
      }));

      setDisputes(disputesData);
    } catch (err) {
      console.error("Error fetching disputes:", err);
      toast.error("Помилка завантаження спорів");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionType) {
      toast.error("Оберіть рішення");
      return;
    }

    setIsResolving(true);
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "closed" })
        .eq("id", selectedDispute.ticket_id);

      if (error) throw error;

      await supabase.from("ticket_messages").insert({
        ticket_id: selectedDispute.ticket_id,
        sender_role: "moderator",
        message_text: `Рішення модератора: ${
          resolutionType === "customer" ? "На користь клієнта" :
          resolutionType === "supplier" ? "На користь постачальника" :
          "Спір відхилено"
        }.\n\n${resolution}`,
      });

      hapticNotification("success");
      toast.success("Спір вирішено");
      setSelectedDispute(null);
      setResolution("");
      setResolutionType("");
      fetchDisputes();
    } catch (err) {
      console.error("Error resolving dispute:", err);
      toast.error("Помилка вирішення спору");
    } finally {
      setIsResolving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("uk-UA", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Scale className="h-5 w-5 text-warning" />
          Спори клієнт/постачальник
        </h3>
        <Badge variant={disputes.length > 0 ? "destructive" : "outline"}>
          {disputes.length} активних
        </Badge>
      </div>

      <ScrollArea className="h-[350px]">
        <div className="space-y-3 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Немає активних спорів</p>
              <p className="text-sm text-muted-foreground mt-1">Всі спірні питання вирішено</p>
            </div>
          ) : (
            disputes.map((dispute) => (
              <Card key={dispute.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      <span className="font-medium">{dispute.reason}</span>
                    </div>
                    <Badge variant="destructive">Очікує</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="truncate">{dispute.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Store className="h-4 w-4" />
                      <span className="truncate">{dispute.supplier_name}</span>
                    </div>
                  </div>

                  {dispute.last_message && (
                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded-lg p-2">
                      {dispute.last_message}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Замовлення: {dispute.order_amount.toLocaleString()} ₴</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(dispute.created_at)}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.info("Відкрийте чат через панель тех. підтримки")}>
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Чат
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => setSelectedDispute(dispute)}>
                      <Scale className="h-4 w-4 mr-1" />
                      Вирішити
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Resolution Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Вирішення спору
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedDispute && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="font-medium">{selectedDispute.reason}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{selectedDispute.customer_name} vs {selectedDispute.supplier_name}</span>
                  <span>{selectedDispute.order_amount.toLocaleString()} ₴</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Рішення</Label>
              <Select value={resolutionType} onValueChange={setResolutionType}>
                <SelectTrigger><SelectValue placeholder="Оберіть рішення..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">На користь клієнта</SelectItem>
                  <SelectItem value="supplier">На користь постачальника</SelectItem>
                  <SelectItem value="rejected">Відхилити спір</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Коментар модератора</Label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Опишіть причину рішення..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>Скасувати</Button>
            <Button onClick={handleResolve} disabled={isResolving || !resolutionType}>
              {isResolving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Прийняти рішення
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
