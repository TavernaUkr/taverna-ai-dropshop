import { ShoppingCart, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
  inStock?: boolean;
  isFavorite?: boolean;
  onClick?: () => void;
  onAddToCart?: () => void;
  onToggleFavorite?: () => void;
}

export const ProductCard = ({
  name,
  price,
  originalPrice,
  image,
  category,
  inStock = true,
  isFavorite = false,
  onClick,
  onAddToCart,
  onToggleFavorite,
}: ProductCardProps) => {
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

  return (
    <div
      className="group relative bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 animate-fade-in border border-border/50"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-live text-live-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
            -{discount}%
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.();
          }}
          className={cn(
            "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-sm",
            isFavorite 
              ? "bg-live/90 text-live-foreground scale-110" 
              : "bg-background/80 text-muted-foreground hover:text-live hover:bg-background hover:scale-110"
          )}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </button>

        {/* Category Badge */}
        {category && (
          <div className="absolute bottom-3 left-3 bg-primary/90 text-primary-foreground text-[10px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm shadow-md">
            {category}
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!inStock && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground bg-muted px-4 py-2 rounded-full">
              Немає в наявності
            </span>
          </div>
        )}

        {/* Quick Add Button */}
        {inStock && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart?.();
            }}
            className={cn(
              "absolute bottom-3 right-3 w-11 h-11 rounded-full",
              "bg-accent text-accent-foreground shadow-lg",
              "flex items-center justify-center",
              "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
              "transition-all duration-300",
              "hover:scale-110 active:scale-95"
            )}
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-card-foreground line-clamp-2 min-h-[40px] leading-snug">
          {name}
        </h3>
        
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">
            {price.toLocaleString()} ₴
          </span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {originalPrice.toLocaleString()} ₴
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
