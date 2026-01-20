import { ShoppingCart, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number; // This is supplier's wholesale price - NEVER show to customer
  image: string;
  category?: string;
  inStock?: boolean;
  isFavorite?: boolean;
  onClick?: () => void;
  onAddToCart?: () => void;
  onToggleFavorite?: () => void;
}

// Generate marketing "old price" - 15-20% higher than retail for discount perception
function getMarketingOldPrice(retailPrice: number): number {
  // Random multiplier between 1.15 and 1.25 for variety
  const multiplier = 1.15 + (Math.random() * 0.10);
  const oldPrice = retailPrice * multiplier;
  
  // Round to nice numbers
  if (oldPrice < 100) {
    return Math.ceil(oldPrice / 5) * 5;
  } else if (oldPrice < 500) {
    return Math.ceil(oldPrice / 10) * 10;
  } else if (oldPrice < 1000) {
    return Math.ceil(oldPrice / 50) * 50;
  } else if (oldPrice < 5000) {
    return Math.ceil(oldPrice / 100) * 100;
  } else {
    return Math.ceil(oldPrice / 500) * 500;
  }
}

export const ProductCard = ({
  name,
  price,
  originalPrice, // Supplier price - hidden from customer
  image,
  category,
  inStock = true,
  isFavorite = false,
  onClick,
  onAddToCart,
  onToggleFavorite,
}: ProductCardProps) => {
  // Generate marketing "old price" for discount perception (15-20% higher than retail)
  // Use a seeded approach based on price to keep it consistent
  const marketingOldPrice = Math.ceil(price * 1.18 / 50) * 50; // ~18% higher, rounded nicely
  
  // Calculate discount percentage based on marketing price
  const discount = Math.round((1 - price / marketingOldPrice) * 100);
  
  // Calculate savings amount for customer
  const savings = marketingOldPrice - price;

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

        {/* Savings Badge */}
        {savings >= 100 && (
          <div className="absolute top-12 left-3 bg-accent text-accent-foreground text-[10px] font-medium px-2 py-0.5 rounded-full shadow-md">
            Економія {savings.toLocaleString()} ₴
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
        
        <div className="mt-3 flex flex-col gap-1">
          {/* Retail price (what customer pays - includes our markup) */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">
              {price.toLocaleString()} ₴
            </span>
            <span className="text-xs font-medium text-live bg-live/10 px-1.5 py-0.5 rounded">
              Акція!
            </span>
          </div>
          
          {/* Marketing "old price" - shows perceived savings */}
          <span className="text-sm text-muted-foreground line-through">
            {marketingOldPrice.toLocaleString()} ₴
          </span>
        </div>
      </div>
    </div>
  );
};
