import { useState, useEffect } from "react";
import { Package, Loader2, Truck, Clock, CheckCircle, XCircle, Eye, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SupplierOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  delivery_tracking: string | null;
  delivery_service: string | null;
  created_at: string;
  items: {
    product_name: string;
    product_image: string | null;
    quantity: number;
    price: number;
    size: string | null;
    color: string | null;
  }[];
  customer_name: string;
}

interface SupplierOrdersProps {
  supplierId: string;
}

export function SupplierOrders({ supplierId }: SupplierOrdersProps) {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [ttnInput, setTtnInput] = useState("");
  const [isSavingTtn, setIsSavingTtn] = useState(false);

  useEffect(() => {
    if (supplierId) fetchOrders();
  }, [supplierId]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Find products belonging to this supplier
      const { data: supplierProducts } = await supabase
        .from("products")
        .select("id")
        .eq("supplier_id", supplierId);

      const productIds = (supplierProducts || []).map(p => p.id);
      if (productIds.length === 0) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      // Find order_items with these products
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("order_id, product_name, product_image, quantity, price, size, color")
        .in("product_id", productIds);

      const orderIds = [...new Set((orderItems || []).map(oi => oi.order_id).filter(Boolean))];
      if (orderIds.length === 0) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      // Fetch orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, order_number, status, total, delivery_tracking, delivery_service, created_at, profile_id")
        .in("id", orderIds as string[])
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch customer names
      const profileIds = [...new Set((ordersData || []).map(o => o.profile_id).filter(Boolean))];
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

      // Combine
      const combined: SupplierOrder[] = (ordersData || []).map(o => ({
        ...o,
        order_number: o.order_number || o.id.slice(0, 8),
        items: (orderItems || []).filter(oi => oi.order_id === o.id).map(oi => ({
          product_name: oi.product_name,
          product_image: oi.product_image,
          quantity: oi.quantity,
          price: oi.price,
          size: oi.size,
          color: oi.color,
        })),
        customer_name: profileMap[o.profile_id || ""] || "Клієнт",
      }));

      setOrders(combined);
    } catch (err) {
      console.error("Error fetching supplier orders:", err);
      toast.error("Помилка завантаження замовлень");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTtn = async (orderId: string) => {
    if (!ttnInput.trim()) return;
    setIsSavingTtn(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_tracking: ttnInput.trim(), status: "shipped" })
        .eq("id", orderId);
      if (error) throw error;
      toast.success("ТТН збережено, статус → Відправлено");
      setTtnInput("");
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, delivery_tracking: ttnInput.trim(), status: "shipped" } : null);
      }
    } catch (err) {
      toast.error("Помилка збереження ТТН");
    } finally {
      setIsSavingTtn(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Нове", variant: "default" },
      processing: { label: "В обробці", variant: "secondary" },
      shipped: { label: "Відправлено", variant: "outline" },
      delivered: { label: "Доставлено", variant: "outline" },
      cancelled: { label: "Скасовано", variant: "destructive" },
    };
    const s = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Замовлення з моїми товарами
        </h3>
        <Badge variant="outline">{orders.length} замовлень</Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-3 pr-2">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Немає замовлень</p>
              <p className="text-xs text-muted-foreground mt-1">Замовлення з вашими товарами з'являться тут</p>
            </div>
          ) : (
            orders.map(order => (
              <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                setSelectedOrder(order);
                setTtnInput(order.delivery_tracking || "");
              }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-foreground">{order.order_number}</span>
                    {getStatusBadge(order.status || "pending")}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>{order.customer_name}</span>
                    <span>{order.total?.toLocaleString()} ₴</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                    {order.delivery_tracking && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {order.delivery_tracking}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Клієнт</span>
                <span className="text-sm font-medium">{selectedOrder.customer_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Статус</span>
                {getStatusBadge(selectedOrder.status || "pending")}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Сума</span>
                <span className="text-sm font-bold">{selectedOrder.total?.toLocaleString()} ₴</span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Товари:</p>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                    {item.product_image ? (
                      <img src={item.product_image} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted-foreground/10 flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {item.price?.toLocaleString()} ₴
                        {item.size && ` • ${item.size}`}
                        {item.color && ` • ${item.color}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* TTN input */}
              {(selectedOrder.status === "pending" || selectedOrder.status === "processing") && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Додати ТТН (номер відстеження):</p>
                  <div className="flex gap-2">
                    <Input
                      value={ttnInput}
                      onChange={e => setTtnInput(e.target.value)}
                      placeholder="20450000000000"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveTtn(selectedOrder.id)}
                      disabled={isSavingTtn || !ttnInput.trim()}
                    >
                      {isSavingTtn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.delivery_tracking && (
                <div className="p-3 bg-primary/5 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">ТТН</p>
                  <p className="text-sm font-mono font-bold text-foreground">{selectedOrder.delivery_tracking}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
