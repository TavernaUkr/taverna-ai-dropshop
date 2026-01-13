import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Heart, Share2, Minus, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Mock product data - in real app this would come from API/database
const mockProduct = {
  id: "1",
  name: "Тактичні рукавички M-Pact чорні",
  sku: "TG-MP-001",
  price: 890,
  originalPrice: 1200,
  description: `Професійні тактичні рукавички M-Pact забезпечують максимальний захист та комфорт під час інтенсивного використання.

Особливості:
• Міцний матеріал зовнішнього шару
• Посилені кісточки для захисту
• Сенсорні пальці для роботи з екранами
• Регульована манжета на липучці
• Дихаюча підкладка

Матеріал: Нейлон, штучна шкіра, термопластичний каучук`,
  images: [
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800",
    "https://images.unsplash.com/photo-1590671070347-e9c6b9a7a7c1?w=800",
    "https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=800",
  ],
  sizes: ["S", "M", "L", "XL", "XXL"],
  colors: ["Чорний", "Олива", "Койот"],
  inStock: true,
  brand: "Mechanix",
  category: "Мілітарі",
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  const product = mockProduct; // In real app: fetch by id
  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100) 
    : 0;

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error("Оберіть розмір");
      return;
    }
    if (!selectedColor) {
      toast.error("Оберіть колір");
      return;
    }
    toast.success(`${product.name} додано до кошика`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `${product.name} - ${product.price} ₴`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Посилання скопійовано");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                isFavorite 
                  ? "text-live bg-live/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
            </button>
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Image Gallery */}
      <div className="relative">
        <div className="aspect-square bg-muted overflow-hidden">
          <img
            src={product.images[selectedImage]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {discount > 0 && (
            <div className="absolute top-4 left-4 bg-live text-live-foreground text-sm font-bold px-3 py-1 rounded-lg">
              -{discount}%
            </div>
          )}
        </div>
        
        {/* Thumbnail Dots */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {product.images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                idx === selectedImage ? "bg-primary w-6" : "bg-white/50"
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Title & Price */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {product.brand}
            </span>
            <span className="text-xs text-muted-foreground">
              Арт: {product.sku}
            </span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-primary">
              {product.price.toLocaleString()} ₴
            </span>
            {product.originalPrice && (
              <span className="text-base text-muted-foreground line-through">
                {product.originalPrice.toLocaleString()} ₴
              </span>
            )}
          </div>
        </div>

        {/* Size Selection */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Розмір: <span className="text-muted-foreground font-normal">{selectedSize || "Не обрано"}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "min-w-[48px] h-10 px-4 rounded-lg border text-sm font-medium transition-all",
                  selectedSize === size
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/50"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Колір: <span className="text-muted-foreground font-normal">{selectedColor || "Не обрано"}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "px-4 h-10 rounded-lg border text-sm font-medium transition-all flex items-center gap-2",
                  selectedColor === color
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/50"
                )}
              >
                {selectedColor === color && <Check className="h-4 w-4" />}
                {color}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Кількість</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 disabled:opacity-50 transition-all"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-all"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Опис</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {product.description}
          </p>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <span className="text-xs text-muted-foreground">Разом:</span>
            <div className="text-xl font-bold text-foreground">
              {(product.price * quantity).toLocaleString()} ₴
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            className={cn(
              "flex-1 py-4 rounded-xl font-semibold text-base",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 active:scale-[0.98]",
              "transition-all shadow-lg",
              "flex items-center justify-center gap-2"
            )}
          >
            <ShoppingCart className="h-5 w-5" />
            Додати до кошика
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
