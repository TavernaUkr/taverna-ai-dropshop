import { useState, useEffect } from "react";
import { Scale, MessageSquare, Loader2, Check, X, AlertTriangle, Package, User, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
      // Fetch support tickets with type "supplier_question" and related order
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select(`
          *,
          order:orders(id, order_number, total, profile_id)
        `)
        .eq("type", "supplier_question")
        .in("status", ["open"])
        .not("related_order_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform to disputes format
      const disputesData: Dispute[] = (tickets || []).map((t, i) => ({
        id: t.id,
        ticket_id: t.id,
        order_id: t.related_order_id || "",
        customer_name: `Клієнт #${i + 1}`,
        supplier_name: `Постачальник`,
        reason: "Питання по замовленню",
        description: "Спірне питання щодо замовлення",
        status: "pending" as const,
        created_at: t.created_at,
        order_amount: t.order?.total || 0,
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
      // Update ticket status
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "closed" })
        .eq("id", selectedDispute.ticket_id);

      if (error) throw error;

      // Add resolution message
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

  const getStatusBadge = (status: Dispute["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="destructive">Очікує</Badge>;
      case "in_review":
        return <Badge variant="secondary">На розгляді</Badge>;
      case "resolved_customer":
        return <Badge className="bg-green-500">На користь клієнта</Badge>;
      case "resolved_supplier":
        return <Badge className="bg-blue-500">На користь постачальника</Badge>;
      case "rejected":
        return <Badge variant="outline">Відхилено</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
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
              <p className="text-sm text-muted-foreground mt-1">
                Всі спірні питання вирішено
              </p>
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
                    {getStatusBadge(dispute.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{dispute.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Store className="h-4 w-4" />
                      <span>{dispute.supplier_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Замовлення: {dispute.order_amount.toLocaleString()} ₴</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(dispute.created_at)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(`/support/chat/${dispute.ticket_id}`, "_blank")}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Чат
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedDispute(dispute)}
                    >
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
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть рішення..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-green-500" />
                      На користь клієнта
                    </div>
                  </SelectItem>
                  <SelectItem value="supplier">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-blue-500" />
                      На користь постачальника
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-muted-foreground" />
                      Відхилити спір
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Коментар модератора</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Опишіть причину рішення..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Скасувати
            </Button>
            <Button onClick={handleResolve} disabled={isResolving || !resolutionType}>
              {isResolving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Прийняти рішення
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
