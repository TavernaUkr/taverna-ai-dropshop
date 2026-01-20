import { Package, Truck, Banknote } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CartItem } from "@/components/CartModal";

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  deliveryCost: number;
  total: number;
}

export const OrderSummary = ({
  items,
  subtotal,
  deliveryCost,
  total,
}: OrderSummaryProps) => {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Ваше замовлення</h3>
      </div>

      {/* Items */}
      <div className="space-y-3 max-h-40 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 rounded-lg object-cover bg-muted"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground line-clamp-1">
                {item.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{item.quantity} шт.</span>
                {item.size && <span>• {item.size}</span>}
                {item.color && <span>• {item.color}</span>}
              </div>
            </div>
            <p className="text-sm font-medium text-foreground whitespace-nowrap">
              {(item.price * item.quantity).toLocaleString()} ₴
            </p>
          </div>
        ))}
      </div>

      <Separator />

      {/* Totals */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Товари ({items.length})</span>
          <span className="text-foreground">{subtotal.toLocaleString()} ₴</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span>Доставка</span>
          </div>
          <span className="text-foreground">
            {deliveryCost > 0 ? `${deliveryCost.toLocaleString()} ₴` : "Безкоштовно"}
          </span>
        </div>
      </div>

      <Separator />

      {/* Total */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">До сплати</span>
        </div>
        <span className="text-xl font-bold text-primary">
          {total.toLocaleString()} ₴
        </span>
      </div>
    </div>
  );
};
