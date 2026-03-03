import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Store, Settings, ShoppingCart, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { SupplierOrders } from "@/components/supplier/SupplierOrders";

interface ManagedShop {
  supplier_id: string;
  shop_name: string;
}

export function AdminStoreOrders() {
  const navigate = useNavigate();
  const { realProfile } = useTelegramAuthContext();
  const [shops, setShops] = useState<ManagedShop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!realProfile?.id) return;
    
    const fetchManagedShops = async () => {
      setIsLoading(true);
      try {
        const { data: links } = await supabase
          .from('shop_manager_links')
          .select('supplier_id')
          .eq('profile_id', realProfile.id);
        
        if (links && links.length > 0) {
          const supplierIds = links.map(l => l.supplier_id);
          const { data: suppliers } = await supabase
            .from('suppliers')
            .select('id, shop_name')
            .in('id', supplierIds)
            .eq('is_active', true);
          
          const managed: ManagedShop[] = (suppliers || []).map(s => ({
            supplier_id: s.id,
            shop_name: s.shop_name,
          }));
          
          setShops(managed);
          if (managed.length > 0 && !selectedShop) {
            setSelectedShop(managed[0].supplier_id);
          }
        }
      } catch (err) {
        console.error('Error fetching managed shops:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchManagedShops();
  }, [realProfile?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="text-center py-12">
        <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="font-medium text-foreground">Немає магазинів під вашим керуванням</p>
        <p className="text-sm text-muted-foreground mt-1">
          Створіть магазин через «+ Додати» без менеджера — він автоматично стане вашим
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Shop selector + actions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть магазин" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map(shop => (
                    <SelectItem key={shop.supplier_id} value={shop.supplier_id}>
                      {shop.shop_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary">{shops.length}</Badge>
          </div>
          {selectedShop && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs flex-1"
                onClick={() => navigate(`/store-management/${selectedShop}`)}
              >
                <Settings className="h-3.5 w-3.5" />
                Керувати магазином
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => navigate(`/supplier/${selectedShop}`)}
              >
                <Eye className="h-3.5 w-3.5" />
                Переглянути
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders for selected shop */}
      {selectedShop && (
        <SupplierOrders key={selectedShop} supplierId={selectedShop} mode="active" />
      )}
    </div>
  );
}
