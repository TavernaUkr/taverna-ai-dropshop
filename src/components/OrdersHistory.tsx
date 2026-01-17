import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle2, Clock, XCircle, ChevronRight, Loader2, MapPin, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTelegramAuthContext } from './TelegramAuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { OrderTracking } from './OrderTracking';

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  size: string | null;
  color: string | null;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  delivery_cost: number;
  total: number;
  notes: string | null;
  delivery_tracking: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  delivery_address?: {
    city: string;
    warehouse_number: string | null;
    street_address: string | null;
    building_number: string | null;
    recipient_name: string;
    phone: string;
  } | null;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  pending: { label: 'Очікує обробки', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  processing: { label: 'В обробці', icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  shipped: { label: 'Відправлено', icon: Truck, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  delivered: { label: 'Доставлено', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Скасовано', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
}

function OrderCard({ order, onViewDetails }: OrderCardProps) {
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const itemsPreview = order.items.slice(0, 3);
  const moreItemsCount = order.items.length - 3;

  return (
    <button
      onClick={() => onViewDetails(order)}
      className="w-full bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-semibold text-foreground">{order.order_number}</span>
          <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
        </div>
        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', status.bgColor, status.color)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </div>
      </div>

      {/* Items Preview */}
      <div className="flex items-center gap-2 mb-3">
        {itemsPreview.map((item, idx) => (
          <div key={idx} className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
            {item.product_image ? (
              <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {moreItemsCount > 0 && (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            +{moreItemsCount}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 text-primary">
          <span className="text-sm font-medium">Деталі</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>{order.items.length} {order.items.length === 1 ? 'товар' : 'товарів'}</span>
        </div>
        <span className="font-bold text-primary">{order.total.toLocaleString()} ₴</span>
      </div>
    </button>
  );
}

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
}

function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  if (!order) return null;

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={onClose}>
      <div 
        className="absolute inset-x-0 bottom-0 bg-background rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-bold text-lg text-foreground">{order.order_number}</h2>
            <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
          </div>
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium', status.bgColor, status.color)}>
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Nova Poshta Tracking */}
          {order.delivery_tracking && (
            <OrderTracking trackingNumber={order.delivery_tracking} />
          )}

          {/* Delivery Address */}
          {order.delivery_address && (
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Адреса доставки</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {order.delivery_address.city}
                {order.delivery_address.warehouse_number && (
                  <>, Відділення №{order.delivery_address.warehouse_number}</>
                )}
                {order.delivery_address.street_address && (
                  <>, {order.delivery_address.street_address} {order.delivery_address.building_number}</>
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {order.delivery_address.recipient_name}, {order.delivery_address.phone}
              </p>
            </div>
          )}

          {/* Items */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Товари</h3>
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3 bg-card rounded-xl p-3 border border-border">
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground line-clamp-2">{item.product_name}</p>
                  {(item.size || item.color) && (
                    <p className="text-xs text-muted-foreground">
                      {item.size && `Розмір: ${item.size}`}
                      {item.size && item.color && ' • '}
                      {item.color && `Колір: ${item.color}`}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{item.quantity} × {item.price.toLocaleString()} ₴</span>
                    <span className="font-bold text-primary">{item.total.toLocaleString()} ₴</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Price Summary */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Товари</span>
              <span className="text-foreground">{order.subtotal.toLocaleString()} ₴</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Доставка</span>
              <span className="text-foreground">{order.delivery_cost.toLocaleString()} ₴</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span className="text-foreground">Всього</span>
              <span className="text-primary">{order.total.toLocaleString()} ₴</span>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm font-medium text-foreground mb-1">Коментар</p>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button onClick={onClose} className="w-full">
            Закрити
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OrdersHistory() {
  const { isAuthenticated, sessionToken } = useTelegramAuthContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    if (!isAuthenticated || !sessionToken) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: {
          action: 'get_orders',
          session_token: sessionToken,
        },
      });

      if (error) throw error;

      if (data?.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated, sessionToken]);

  if (!isAuthenticated) {
    return (
      <div className="space-y-4 pb-28 animate-fade-in">
        <h2 className="text-lg font-bold text-foreground">Мої Замовлення</h2>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-1">Увійдіть для перегляду</h3>
          <p className="text-sm text-muted-foreground">
            Історія замовлень доступна для авторизованих користувачів
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 pb-28 animate-fade-in">
        <h2 className="text-lg font-bold text-foreground">Мої Замовлення</h2>
        
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground mt-4">Завантаження...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Мої Замовлення</h2>
        <Button variant="ghost" size="sm" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-1">Ще немає замовлень</h3>
          <p className="text-sm text-muted-foreground">
            Ваші замовлення з'являться тут після покупки
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onViewDetails={setSelectedOrder}
            />
          ))}
        </div>
      )}

      <OrderDetailsModal 
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
