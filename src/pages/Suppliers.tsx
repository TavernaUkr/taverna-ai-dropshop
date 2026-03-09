import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Star, MapPin, Package, ChevronRight, Verified, Loader2, User, MessageSquare, Tag } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Badge } from "@/components/ui/badge";
import { useCartContext } from "@/contexts/CartContext";
import { useFavoritesContext } from "@/components/FavoritesContext";
import { SearchModal } from "@/components/SearchModal";
import { CartModal } from "@/components/CartModal";
import { WishlistModal } from "@/components/WishlistModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Supplier {
  id: string | null;
  shop_name: string | null;
  is_active: boolean | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  product_count?: number;
}

const Suppliers = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("suppliers");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { items: cartItems, totalItems, updateQuantity, removeItem } = useCartContext();
  const { totalFavorites } = useFavoritesContext();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch suppliers with logo and cover
      const { data: suppliersData, error } = await supabase
        .from('suppliers')
        .select('id, shop_name, is_active, logo_url, cover_image_url')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Get product counts for each supplier
      const suppliersWithCounts = await Promise.all(
        (suppliersData || []).map(async (supplier) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('supplier_id', supplier.id)
            .eq('in_stock', true);
          
          return {
            ...supplier,
            product_count: count || 0,
          };
        })
      );
      
      setSuppliers(suppliersWithCounts);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Помилка завантаження постачальників');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    if (tab === "catalog") {
      navigate("/");
    } else if (tab === "suppliers") {
      setActiveTab(tab);
    } else if (tab === "support") {
      navigate("/support");
    } else if (tab === "account") {
      navigate("/?tab=account");
    } else if (tab === "live") {
      navigate("/?tab=live");
    } else {
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Постачальників ще немає</p>
            <p className="text-sm text-muted-foreground mt-2">
              Станьте першим партнером Taverna Group!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="w-full bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 text-left group"
              >
                {/* Cover Banner */}
                <button
                  onClick={() => navigate(`/supplier/${supplier.id}`)}
                  className="w-full text-left"
                >
                  <div className="h-24 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 overflow-hidden relative">
                    {supplier.cover_image_url ? (
                      <img src={supplier.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
                  </div>

                  <div className="px-5 pb-3 -mt-8 relative">
                    <div className="flex items-end gap-3 mb-3">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-xl bg-card border-2 border-card shadow-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {supplier.logo_url ? (
                          <img src={supplier.logo_url} alt={supplier.shop_name || ''} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="h-7 w-7 text-primary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pb-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate text-lg group-hover:text-primary transition-colors">
                            {supplier.shop_name}
                          </h3>
                          <Verified className="h-4 w-4 text-primary flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground">Офіційний партнер Taverna</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full">
                          <Package className="h-3.5 w-3.5" />
                          {supplier.product_count || 0} товарів
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </button>
                
                {/* Contact Seller Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const tg = (window as any).Telegram?.WebApp;
                    if (tg?.openTelegramLink) {
                      tg.openTelegramLink("https://t.me/taverna_support_bot?start=seller_" + supplier.id);
                    } else {
                      window.open("https://t.me/taverna_support_bot?start=seller_" + supplier.id, "_blank");
                    }
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Звернутись до продавця
                </button>
              </div>
            ))}
          </div>
        )}
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
