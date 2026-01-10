import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
  inStock?: boolean;
  onClick?: () => void;
  onAddToCart?: () => void;
}

export const ProductCard = ({
  name,
  price,
  originalPrice,
  image,
  category,
  inStock = true,
  onClick,
  onAddToCart,
}: ProductCardProps) => {
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

  return (
    <div
      className="group relative bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-live text-live-foreground text-xs font-bold px-2 py-1 rounded-md">
            -{discount}%
          </div>
        )}

        {/* Category Badge */}
        {category && (
          <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px] font-medium px-2 py-1 rounded-md backdrop-blur-sm">
            {category}
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!inStock && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground">
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
              "absolute bottom-2 right-2 w-10 h-10 rounded-full",
              "bg-accent text-accent-foreground shadow-md",
              "flex items-center justify-center",
              "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
              "transition-all duration-200",
              "hover:scale-110 active:scale-95"
            )}
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-card-foreground line-clamp-2 min-h-[40px]">
          {name}
        </h3>
        
        <div className="mt-2 flex items-baseline gap-2">
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
