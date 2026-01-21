import { ShoppingCart, Heart, Package, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { LowStockBadge } from "./product/LowStockBadge";
import { VerifiedBadge } from "./ui/verified-badge";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { hapticImpact } from "@/lib/haptics";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number; // This is supplier's wholesale price - NEVER show to customer
  image: string;
  videoUrl?: string;
  category?: string;
  inStock?: boolean;
  stockQuantity?: number;
  sizes?: string[];
  colors?: string[];
  rating?: number;
  reviewCount?: number;
  isFavorite?: boolean;
  isBoosted?: boolean;
  viewsCount?: number;
  supplierRating?: number;
  supplierVerified?: boolean;
  onClick?: () => void;
  onAddToCart?: () => void;
  onToggleFavorite?: () => void;
}

// Color abbreviation mapping
const colorMap: Record<string, { abbr: string; color: string }> = {
  "чорний": { abbr: "Чрн", color: "#000000" },
  "black": { abbr: "Чрн", color: "#000000" },
  "білий": { abbr: "Біл", color: "#ffffff" },
  "white": { abbr: "Біл", color: "#ffffff" },
  "олива": { abbr: "Олв", color: "#556b2f" },
  "olive": { abbr: "Олв", color: "#556b2f" },
  "хакі": { abbr: "Хкі", color: "#c3b091" },
  "khaki": { abbr: "Хкі", color: "#c3b091" },
  "сірий": { abbr: "Сір", color: "#808080" },
  "gray": { abbr: "Сір", color: "#808080" },
  "зелений": { abbr: "Злн", color: "#228b22" },
  "green": { abbr: "Злн", color: "#228b22" },
  "синій": { abbr: "Снй", color: "#0000cd" },
  "blue": { abbr: "Снй", color: "#0000cd" },
  "коричневий": { abbr: "Крч", color: "#8b4513" },
  "brown": { abbr: "Крч", color: "#8b4513" },
  "бежевий": { abbr: "Бжв", color: "#f5f5dc" },
  "beige": { abbr: "Бжв", color: "#f5f5dc" },
  "червоний": { abbr: "Чрв", color: "#dc143c" },
  "red": { abbr: "Чрв", color: "#dc143c" },
  "мультикам": { abbr: "Мкм", color: "#6b8e23" },
  "multicam": { abbr: "Мкм", color: "#6b8e23" },
  "песочний": { abbr: "Псч", color: "#c2b280" },
  "sand": { abbr: "Псч", color: "#c2b280" },
};

const getColorInfo = (colorName: string) => {
  const normalized = colorName.toLowerCase().trim();
  return colorMap[normalized] || { abbr: colorName.slice(0, 3), color: "#888888" };
};

export const ProductCard = ({
  name,
  price,
  originalPrice, // Supplier price - hidden from customer
  image,
  videoUrl,
  category,
  inStock = true,
  stockQuantity,
  sizes,
  colors,
  rating,
  reviewCount,
  isFavorite = false,
  isBoosted = false,
  viewsCount,
  supplierRating,
  supplierVerified = false,
  onClick,
  onAddToCart,
  onToggleFavorite,
}: ProductCardProps) => {
  // Generate marketing "old price" for discount perception (15-20% higher than retail)
  const marketingOldPrice = Math.ceil(price * 1.18 / 50) * 50;
  
  // Calculate discount percentage based on marketing price
  const discount = Math.round((1 - price / marketingOldPrice) * 100);
  
  // Calculate savings amount for customer
  const savings = marketingOldPrice - price;

  // Format sizes for display (show first 3-4)
  const displaySizes = sizes?.slice(0, 4) || [];
  const hasMoreSizes = sizes && sizes.length > 4;

  // Format colors for display (show first 3-4)
  const displayColors = colors?.slice(0, 4) || [];
  const hasMoreColors = colors && colors.length > 4;

  // Show verified badge for high-rated suppliers
  const isVerifiedSupplier = supplierVerified || (supplierRating !== undefined && supplierRating >= 4.5);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticImpact("medium");
    onAddToCart?.();
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticImpact("light");
    onToggleFavorite?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border/50",
        isBoosted && "ring-2 ring-primary/50 shadow-primary/20 shadow-lg"
      )}
      onClick={onClick}
    >
      {/* Image with Video Preview on Hover */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {/* Boosted Badge - Inside image container at top */}
        {isBoosted && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-primary via-primary/80 to-accent text-primary-foreground text-[10px] font-bold py-1.5 text-center flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3" />
            ТОП ПРОПОЗИЦІЯ
          </div>
        )}
        
        {/* Video Preview (shows on hover if video exists) */}
        {videoUrl && (
          <video
            src={videoUrl}
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        )}
        <img
          src={image}
          alt={name}
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            videoUrl ? "group-hover:opacity-0 group-hover:scale-110" : "group-hover:scale-110"
          )}
        />
        
        {/* Low Stock Badge - FOMO effect - Top center but below boosted badge */}
        {inStock && stockQuantity !== undefined && stockQuantity > 0 && stockQuantity <= 5 && (
          <div className={cn(
            "absolute left-1/2 -translate-x-1/2 z-15",
            isBoosted ? "top-10" : "top-3"
          )}>
            <LowStockBadge quantity={stockQuantity} animated={true} />
          </div>
        )}

        {/* Discount Badge - Bottom left to avoid collision */}
        {discount > 0 && inStock && (
          <div className="absolute bottom-12 left-3 bg-live text-live-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-lg z-10">
            -{discount}%
          </div>
        )}

        {/* Savings Badge - Below discount */}
        {savings >= 100 && inStock && (
          <div className="absolute bottom-6 left-3 bg-accent text-accent-foreground text-[10px] font-medium px-2 py-0.5 rounded-full shadow-md z-10">
            Економія {savings.toLocaleString()} ₴
          </div>
        )}

        {/* Favorite Button - Top right, with offset for boosted */}
        <button
          onClick={handleToggleFavorite}
          className={cn(
            "absolute right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-sm z-20",
            isBoosted ? "top-10" : "top-3",
            isFavorite 
              ? "bg-live/90 text-live-foreground scale-110" 
              : "bg-background/80 text-muted-foreground hover:text-live hover:bg-background hover:scale-110"
          )}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </button>

        {/* Verified Supplier Badge - Next to favorite */}
        {isVerifiedSupplier && (
          <div className={cn(
            "absolute right-14 z-20",
            isBoosted ? "top-10" : "top-3"
          )}>
            <VerifiedBadge size="sm" showTooltip />
          </div>
        )}

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

        {/* Quick Add Button - Always visible on mobile, hover on desktop */}
        {inStock && (
          <motion.button
            onClick={handleAddToCart}
            initial={{ opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "absolute bottom-3 right-3 w-11 h-11 rounded-full",
              "bg-accent text-accent-foreground shadow-lg",
              "flex items-center justify-center",
              "opacity-100 md:opacity-0 md:group-hover:opacity-100",
              "transition-opacity duration-300"
            )}
          >
            <ShoppingCart className="h-5 w-5" />
          </motion.button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-card-foreground line-clamp-2 min-h-[40px] leading-snug">
          {name}
        </h3>
        
        {/* Rating */}
        {rating !== undefined && rating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-3 w-3",
                    star <= Math.round(rating) ? "text-warning fill-warning" : "text-muted"
                  )}
                />
              ))}
            </div>
            {reviewCount !== undefined && reviewCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                ({reviewCount})
              </span>
            )}
          </div>
        )}
        
        {/* Price and Variants Row */}
        <div className="mt-2 flex items-start justify-between gap-2">
          {/* Price Column */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-primary">
                {price.toLocaleString()} ₴
              </span>
              {inStock && (
                <span className="text-[10px] font-medium text-live bg-live/10 px-1 py-0.5 rounded">
                  Акція
                </span>
              )}
            </div>
            
            {/* Marketing "old price" */}
            {inStock && (
              <span className="text-xs text-muted-foreground line-through">
                {marketingOldPrice.toLocaleString()} ₴
              </span>
            )}
          </div>

          {/* Variants Column */}
          <div className="flex flex-col items-end gap-1 text-right shrink-0">
            {/* Stock Quantity */}
            {inStock && stockQuantity !== undefined && stockQuantity > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Package className="h-3 w-3" />
                <span>{stockQuantity > 99 ? "99+" : stockQuantity} шт</span>
              </div>
            )}

            {/* Sizes */}
            {displaySizes.length > 0 && (
              <div className="flex items-center gap-0.5 flex-wrap justify-end">
                {displaySizes.map((size, idx) => (
                  <span 
                    key={idx}
                    className="text-[9px] bg-muted px-1 py-0.5 rounded font-medium"
                  >
                    {size}
                  </span>
                ))}
                {hasMoreSizes && (
                  <span className="text-[9px] text-muted-foreground">+{sizes!.length - 4}</span>
                )}
              </div>
            )}

            {/* Colors */}
            {displayColors.length > 0 && (
              <div className="flex items-center gap-0.5 flex-wrap justify-end">
                {displayColors.map((color, idx) => {
                  const info = getColorInfo(color);
                  return (
                    <span 
                      key={idx}
                      className="w-4 h-4 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: info.color }}
                      title={color}
                    />
                  );
                })}
                {hasMoreColors && (
                  <span className="text-[9px] text-muted-foreground">+{colors!.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};