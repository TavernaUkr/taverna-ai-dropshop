import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Star, MapPin, Package, ChevronRight, Verified, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Badge } from "@/components/ui/badge";
import { useCartContext } from "@/contexts/CartContext";
import { useFavoritesContext } from "@/components/FavoritesContext";
import { SearchModal } from "@/components/SearchModal";
import { CartModal } from "@/components/CartModal";
import { WishlistModal } from "@/components/WishlistModal";
import { toast } from "sonner";

interface Supplier {
  id: string;
  shopName: string;
  logo?: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  location: string;
  isVerified: boolean;
  categories: string[];
  description: string;
}

// Mock suppliers data
const mockSuppliers: Supplier[] = [
  {
    id: "1",
    shopName: "TacGear Pro",
    rating: 4.8,
    reviewCount: 234,
    productCount: 156,
    location: "Київ",
    isVerified: true,
    categories: ["Мілітарі", "Тактичне спорядження"],
    description: "Офіційний дистриб'ютор тактичного спорядження від провідних брендів",
  },
  {
    id: "2",
    shopName: "Military Style UA",
    rating: 4.6,
    reviewCount: 189,
    productCount: 98,
    location: "Харків",
    isVerified: true,
    categories: ["Одяг", "Взуття"],
    description: "Військовий одяг та взуття від українських виробників",
  },
  {
    id: "3",
    shopName: "Surplus Store",
    rating: 4.4,
    reviewCount: 67,
    productCount: 234,
    location: "Одеса",
    isVerified: false,
    categories: ["Surplus", "Аксесуари"],
    description: "Найбільший вибір військового surplus спорядження",
  },
  {
    id: "4",
    shopName: "Combat Boots UA",
    rating: 4.9,
    reviewCount: 312,
    productCount: 45,
    location: "Львів",
    isVerified: true,
    categories: ["Взуття"],
    description: "Спеціалізований магазин тактичного взуття",
  },
  {
    id: "5",
    shopName: "Tactical Accessories",
    rating: 4.3,
    reviewCount: 89,
    productCount: 178,
    location: "Дніпро",
    isVerified: false,
    categories: ["Аксесуари", "Ножі"],
    description: "Тактичні аксесуари, ножі та EDC спорядження",
  },
];

const Suppliers = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("suppliers");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  
  const { items: cartItems, totalItems, updateQuantity, removeItem } = useCartContext();
  const { totalFavorites } = useFavoritesContext();

  const handleTabChange = (tab: string) => {
    if (tab === "catalog") {
      navigate("/");
    } else if (tab === "suppliers") {
      setActiveTab(tab);
    } else if (tab === "support") {
      navigate("/support");
    } else if (tab === "account") {
      navigate("/");
      // Navigate to account tab
    } else {
      setActiveTab(tab);
      navigate("/");
    }
  };

  const handleSearch = (query: string) => {
    setIsSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartCount={totalItems}
        favoritesCount={totalFavorites}
        onCartClick={() => setIsCartOpen(true)}
        onSearchClick={() => setIsSearchOpen(true)}
        onNotificationsClick={() => toast.info("Сповіщення")}
        onFavoritesClick={() => setIsWishlistOpen(true)}
      />
      
      <main className="px-4 py-4 pb-28">
        <div className="flex items-center gap-2 mb-4">
          <Store className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Постачальники</h1>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6">
          Обирайте товари від перевірених партнерів Taverna Group
        </p>

        <div className="space-y-4">
          {mockSuppliers.map((supplier) => (
            <button
              key={supplier.id}
              onClick={() => navigate(`/supplier/${supplier.id}`)}
              className="w-full bg-card rounded-xl p-4 border border-border hover:border-primary/50 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Store className="h-7 w-7 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">
                      {supplier.shopName}
                    </h3>
                    {supplier.isVerified && (
                      <Verified className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      {supplier.rating}
                    </span>
                    <span>({supplier.reviewCount} відгуків)</span>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {supplier.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {supplier.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {supplier.productCount} товарів
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {supplier.categories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
            </button>
          ))}
        </div>
      </main>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={handleSearch}
      />

      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onCheckout={() => {
          setIsCartOpen(false);
          navigate("/");
        }}
      />

      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        onProductClick={(id) => {
          setIsWishlistOpen(false);
          navigate(`/product/${id}`);
        }}
      />
    </div>
  );
};

export default Suppliers;
