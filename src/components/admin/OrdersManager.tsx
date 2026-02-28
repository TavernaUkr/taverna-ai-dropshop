import { useState } from 'react';
import {
  Package, Truck, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, 
  Eye, Loader2, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MOCK_ORDERS, MockOrder } from '@/data/mockOrders';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Очікує', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  processing: { label: 'В обробці', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  shipped: { label: 'Відправлено', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  delivered: { label: 'Доставлено', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Скасовано', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export function OrdersManager() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o));
    toast.success(`Статус замовлення змінено на "${statusConfig[newStatus]?.label}"`);
  };

  const handleAddTracking = (orderId: string) => {
    const tracking = trackingInputs[orderId];
    if (!tracking?.trim()) {
      toast.error("Введіть номер ТТН");
      return;
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivery_tracking: tracking, status: 'shipped' } : o));
    toast.success(`ТТН ${tracking} додано`);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  return (
    <ScrollArea className="h-[calc(100vh-380px)]">
      <div className="space-y-4 pr-4">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Всього', count: statusCounts.all, color: 'bg-primary/10 text-primary' },
            { label: 'Нові', count: statusCounts.pending, color: 'bg-yellow-100 text-yellow-700' },
            { label: 'Обробка', count: statusCounts.processing, color: 'bg-blue-100 text-blue-700' },
            { label: 'Відправ.', count: statusCounts.shipped, color: 'bg-purple-100 text-purple-700' },
            { label: 'Достав.', count: statusCounts.delivered, color: 'bg-green-100 text-green-700' },
          ].map(s => (
            <div key={s.label} className={cn("rounded-lg p-2 text-center", s.color)}>
              <p className="text-lg font-bold">{s.count}</p>
              <p className="text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Orders list */}
        {orders.map(order => {
          const st = statusConfig[order.status] || statusConfig.pending;
          const isExpanded = expandedId === order.id;

          return (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                  <Badge className={cn(st.bgColor, st.color, "border-0")}>{st.label}</Badge>
                </div>

                {/* Items preview */}
                <div className="flex gap-2 overflow-x-auto">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 min-w-0 flex-shrink-0">
                      <img src={item.product_image} alt="" className="w-8 h-8 rounded object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate max-w-[120px]">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} × {item.price.toLocaleString()} ₴</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{order.total.toLocaleString()} ₴</span>
                  <button onClick={() => setExpandedId(isExpanded ? null : order.id)} className="flex items-center gap-1 text-xs text-primary">
                    <Eye className="h-3.5 w-3.5" />
                    {isExpanded ? 'Згорнути' : 'Керувати'}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    {/* Delivery info */}
                    {order.delivery_address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-foreground">{order.delivery_address.city}{order.delivery_address.warehouse_number && `, Від. №${order.delivery_address.warehouse_number}`}</p>
                          <p className="text-muted-foreground">{order.delivery_address.recipient_name}, {order.delivery_address.phone}</p>
                        </div>
                      </div>
                    )}

                    {/* Status change */}
                    <div className="space-y-2">
                      <Label className="text-xs">Змінити статус</Label>
                      <Select value={order.status} onValueChange={(v) => handleStatusChange(order.id, v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Очікує обробки</SelectItem>
                          <SelectItem value="processing">В обробці</SelectItem>
                          <SelectItem value="shipped">Відправлено</SelectItem>
                          <SelectItem value="delivered">Доставлено</SelectItem>
                          <SelectItem value="cancelled">Скасовано</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Add tracking */}
                    {!order.delivery_tracking && (
                      <div className="space-y-2">
                        <Label className="text-xs">Додати ТТН</Label>
                        <div className="flex gap-2">
                          <Input
                            value={trackingInputs[order.id] || ''}
                            onChange={e => setTrackingInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                            placeholder="20450000000000"
                            className="flex-1"
                          />
                          <Button size="sm" onClick={() => handleAddTracking(order.id)}>
                            <Truck className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {order.delivery_tracking && (
                      <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">ТТН:</span>
                        <span className="font-mono text-foreground">{order.delivery_tracking}</span>
                      </div>
                    )}

                    {order.notes && (
                      <div className="bg-muted/50 rounded-lg p-2 text-sm">
                        <p className="text-xs text-muted-foreground">Коментар клієнта:</p>
                        <p className="text-foreground">{order.notes}</p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Оплата: {order.payment_method === 'card' ? 'Карткою' : 'Накладний платіж'} • {order.payment_status === 'paid' ? '✓ Оплачено' : 'Очікує'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
