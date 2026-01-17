import { X, Heart, ShoppingCart, Trash2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavoritesContext } from './FavoritesContext';
import { useCartContext } from '@/contexts/CartContext';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductClick?: (productId: string) => void;
}

export function WishlistModal({ isOpen, onClose, onProductClick }: WishlistModalProps) {
  const { favorites, removeFavorite } = useFavoritesContext();
  const { addItem } = useCartContext();

  if (!isOpen) return null;

  const handleAddToCart = async (item: typeof favorites[0]) => {
    const success = await addItem(item.productId, item.name, item.price, item.image);
    if (success) {
      toast.success(`${item.name} додано до кошика`);
    }
  };

  const handleRemove = async (productId: string) => {
    await removeFavorite(productId);
    toast.success('Видалено з обраного');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={onClose}>
      <div 
        className="absolute inset-x-0 bottom-0 bg-background rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-live fill-live" />
            <h2 className="font-bold text-lg text-foreground">Обране</h2>
            <span className="text-sm text-muted-foreground">({favorites.length})</span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Heart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">Список порожній</h3>
              <p className="text-sm text-muted-foreground">
                Додайте товари до обраного, щоб не втратити їх
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((item) => (
                <div 
                  key={item.id} 
                  className="flex gap-3 bg-card rounded-xl p-3 border border-border"
                >
                  <button
                    onClick={() => onProductClick?.(item.productId)}
                    className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0"
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <button 
                      onClick={() => onProductClick?.(item.productId)}
                      className="text-left"
                    >
                      <p className="font-medium text-sm text-foreground line-clamp-2">
                        {item.name}
                      </p>
                    </button>
                    <p className="font-bold text-primary mt-1">
                      {item.price.toLocaleString()} ₴
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(item)}
                        className="flex-1 h-9 text-xs"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                        До кошика
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(item.productId)}
                        className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
