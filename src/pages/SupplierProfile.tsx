import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Store, Star, MapPin, Package, Verified, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/ProductCard";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useCartContext } from "@/contexts/CartContext";
import { useFavoritesContext } from "@/components/FavoritesContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Mock supplier data
const mockSupplierData: Record<string, {
  shopName: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  location: string;
  isVerified: boolean;
  categories: string[];
  description: string;
  returnPolicy: string;
}> = {
  "1": {
    shopName: "TacGear Pro",
    rating: 4.8,
    reviewCount: 234,
    productCount: 156,
    location: "Київ",
    isVerified: true,
    categories: ["Мілітарі", "Тактичне спорядження"],
    description: "Офіційний дистриб'ютор тактичного спорядження від провідних брендів. Працюємо на ринку з 2018 року.",
    returnPolicy: "Повернення товару можливе протягом 14 днів з моменту отримання за умови збереження товарного вигляду та упаковки. Для оформлення повернення зверніться до нашої служби підтримки. Кошти повертаються протягом 3-5 робочих днів на картку, з якої було здійснено оплату.",
  },
  "2": {
    shopName: "Military Style UA",
    rating: 4.6,
    reviewCount: 189,
    productCount: 98,
    location: "Харків",
    isVerified: true,
    categories: ["Одяг", "Взуття"],
    description: "Військовий одяг та взуття від українських виробників. Підтримуємо вітчизняного виробника!",
    returnPolicy: "Обмін та повернення протягом 30 днів. Взуття можна приміряти, але воно має бути чистим та без слідів носіння. Повернення коштів здійснюється протягом 7 робочих днів.",
  },
  "3": {
    shopName: "Surplus Store",
    rating: 4.4,
    reviewCount: 67,
    productCount: 234,
    location: "Одеса",
    isVerified: false,
    categories: ["Surplus", "Аксесуари"],
    description: "Найбільший вибір військового surplus спорядження з усього світу.",
    returnPolicy: "Surplus товари обміну та поверненню не підлягають, оскільки є вживаними. Нові товари можна повернути протягом 14 днів.",
  },
  "4": {
    shopName: "Combat Boots UA",
    rating: 4.9,
    reviewCount: 312,
    productCount: 45,
    location: "Львів",
    isVerified: true,
    categories: ["Взуття"],
    description: "Спеціалізований магазин тактичного взуття. Тільки оригінальні бренди.",
    returnPolicy: "Безкоштовне повернення протягом 60 днів! Ми впевнені в якості нашого взуття. Можна повернути навіть ношене взуття, якщо воно не підійшло за розміром.",
  },
  "5": {
    shopName: "Tactical Accessories",
    rating: 4.3,
    reviewCount: 89,
    productCount: 178,
    location: "Дніпро",
    isVerified: false,
    categories: ["Аксесуари", "Ножі"],
    description: "Тактичні аксесуари, ножі та EDC спорядження для справжніх ентузіастів.",
    returnPolicy: "Ножі та гострі предмети поверненню не підлягають. Інші аксесуари можна повернути протягом 14 днів в оригінальній упаковці.",
  },
};

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  images: string[];
  in_stock: boolean;
  category?: { name: string };
}

const SupplierProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { addItem } = useCartContext();
  const { isFavorite, toggleFavorite } = useFavoritesContext();

  const supplier = id ? mockSupplierData[id] : null;

  useEffect(() => {
    const fetchProducts = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        // Try to fetch products from this supplier
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, original_price, images, in_stock, category:categories(name)")
          .eq("supplier_id", id)
          .limit(20);

        if (!error && data && data.length > 0) {
          setProducts(data as Product[]);
        } else {
          // Use mock products
          const { data: allProducts } = await supabase
            .from("products")
            .select("id, name, price, original_price, images, in_stock, category:categories(name)")
            .limit(8);
          
          if (allProducts) {
            setProducts(allProducts as Product[]);
          }
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [id]);

  const handleAddToCart = async (product: Product) => {
    const success = await addItem(
      product.id,
      product.name,
      product.price,
      product.images?.[0]
    );
    if (success) {
      toast.success(`${product.name} додано до кошика`);
    }
  };

  const handleToggleFavorite = async (product: Product) => {
    await toggleFavorite(
      product.id,
      product.name,
      product.price,
      product.images?.[0]
    );
  };

  if (!supplier) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Постачальника не знайдено</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/suppliers")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg truncate">{supplier.shopName}</h1>
              {supplier.isVerified && (
                <Verified className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{supplier.location}</p>
          </div>
        </div>
      </div>

      {/* Supplier Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 text-sm mb-1">
              <span className="flex items-center gap-1 text-foreground">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <strong>{supplier.rating}</strong>
              </span>
              <span className="text-muted-foreground">
                ({supplier.reviewCount} відгуків)
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{supplier.productCount} товарів</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          {supplier.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {supplier.categories.map((cat) => (
            <Badge key={cat} variant="secondary">
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="w-full grid grid-cols-2 mx-4 mt-4">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Товари
          </TabsTrigger>
          <TabsTrigger value="policy" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Повернення
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="p-4 pb-28">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  originalPrice={product.original_price}
                  image={product.images?.[0] || "/placeholder.svg"}
                  category={product.category?.name}
                  inStock={product.in_stock !== false}
                  isFavorite={isFavorite(product.id)}
                  onClick={() => navigate(`/product/${product.id}`)}
                  onAddToCart={() => handleAddToCart(product)}
                  onToggleFavorite={() => handleToggleFavorite(product)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Товари не знайдено</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="policy" className="p-4 pb-28">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Політика повернення</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {supplier.returnPolicy}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <BottomNavigation 
        activeTab="suppliers" 
        onTabChange={(tab) => {
          if (tab === "catalog") navigate("/");
          else if (tab === "suppliers") navigate("/suppliers");
          else if (tab === "support") navigate("/support");
          else navigate("/");
        }} 
      />
    </div>
  );
};

export default SupplierProfile;
