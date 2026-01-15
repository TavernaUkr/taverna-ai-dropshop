import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CartItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  image: string;
  size?: string;
  color?: string;
  quantity: number;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export const CartModal = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartModalProps) => {
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={onClose}>
      <div 
        className="absolute inset-x-0 bottom-0 bg-background rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold text-lg text-foreground">Кошик</h2>
              <span className="text-sm text-muted-foreground">
                {totalItems} {totalItems === 1 ? "товар" : "товарів"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Кошик порожній</h3>
              <p className="text-sm text-muted-foreground">
                Додайте товари з каталогу
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-card rounded-xl border border-border"
                >
                  {/* Image */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded-lg object-cover bg-muted"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground line-clamp-2">
                      {item.name}
                    </h4>
                    {(item.size || item.color) && (
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {item.size && <span>Розмір: {item.size}</span>}
                        {item.color && <span>Колір: {item.color}</span>}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold text-primary">
                        {(item.price * item.quantity).toLocaleString()} ₴
                      </span>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted-foreground">Сума замовлення:</span>
              <span className="text-xl font-bold text-foreground">
                {totalPrice.toLocaleString()} ₴
              </span>
            </div>
            <button
              onClick={onCheckout}
              className={cn(
                "w-full py-4 rounded-xl font-semibold text-base",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 active:scale-[0.98]",
                "transition-all shadow-lg"
              )}
            >
              Оформити замовлення
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
