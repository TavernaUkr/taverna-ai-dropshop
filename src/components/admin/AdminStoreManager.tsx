import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store, Settings, ChevronRight, Loader2, UserPlus, Send,
  Shield, Eye, Edit3, ArrowRightLeft, X, Bot, Check, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hapticSelection } from "@/lib/haptics";

interface AdminSupplier {
  id: string;
  shop_name: string;
  company_name: string;
  contact_name: string;
  is_active: boolean;
  markup_percentage: number | null;
  created_at: string;
  logo_url: string | null;
  cover_image_url: string | null;
  manager_telegram: string | null;
  allow_bot_chat: boolean | null;
  tax_code: string | null;
  xml_url: string | null;
  description: string | null;
  product_count?: number;
}

export function AdminStoreManager({ filter = 'all' }: { filter?: 'all' | 'partners' }) {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [transferDialog, setTransferDialog] = useState<{ supplier: AdminSupplier } | null>(null);
  const [transferTelegramId, setTransferTelegramId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [editManagerDialog, setEditManagerDialog] = useState<{ supplier: AdminSupplier } | null>(null);
  const [managerTelegram, setManagerTelegram] = useState("");
  const [isSavingManager, setIsSavingManager] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, [filter]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, shop_name, company_name, contact_name, is_active, markup_percentage, created_at, logo_url, cover_image_url, manager_telegram, allow_bot_chat, tax_code, xml_url, description")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch product counts
      const supplierIds = (data || []).map(s => s.id);
      const { data: products } = await supabase
        .from("products")
        .select("supplier_id")
        .in("supplier_id", supplierIds);

      const countMap: Record<string, number> = {};
      (products || []).forEach(p => {
        if (p.supplier_id) countMap[p.supplier_id] = (countMap[p.supplier_id] || 0) + 1;
      });

      let allSuppliers = (data || []).map(s => ({ ...s, product_count: countMap[s.id] || 0 })) as AdminSupplier[];
      
      // Filter for partners: suppliers that have a real manager_telegram assigned
      if (filter === 'partners') {
        allSuppliers = allSuppliers.filter(s => s.manager_telegram && s.manager_telegram.trim() !== '');
      }
      
      setSuppliers(allSuppliers);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      toast.error("Помилка завантаження магазинів");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferDialog || !transferTelegramId.trim()) {
      toast.error("Вкажіть Telegram ID нового власника");
      return;
    }

    setIsTransferring(true);
    try {
      // Find user by telegram_id in profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, telegram_id, first_name, last_name")
        .eq("telegram_id", parseInt(transferTelegramId))
        .limit(1);

      if (!profiles?.length) {
        toast.error(
          "Користувача з таким Telegram ID не знайдено. Попросіть його спочатку відкрити додаток через Telegram."
        );
        setIsTransferring(false);
        return;
      }

      const targetProfile = profiles[0];

      // Add supplier role to user
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: targetProfile.id, role: "supplier" as any },
          { onConflict: "user_id,role" }
        );

      if (roleError && roleError.code !== "23505") {
        throw roleError;
      }

      // Update supplier manager_telegram and link
      await supabase
        .from("suppliers")
        .update({
          manager_telegram: `@tg_${transferTelegramId}`,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", transferDialog.supplier.id);

      toast.success(
        `Магазин "${transferDialog.supplier.shop_name}" передано користувачу ${targetProfile.first_name || ""} ${targetProfile.last_name || ""} (TG ID: ${transferTelegramId})`
      );

      setTransferDialog(null);
      setTransferTelegramId("");
      fetchSuppliers();
    } catch (err: any) {
      console.error("Transfer error:", err);
      toast.error(err.message || "Помилка передачі магазину");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSaveManager = async () => {
    if (!editManagerDialog) return;
    setIsSavingManager(true);
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({
          manager_telegram: managerTelegram.trim(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", editManagerDialog.supplier.id);

      if (error) throw error;
      toast.success("Менеджера оновлено");
      setEditManagerDialog(null);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || "Помилка");
    } finally {
      setIsSavingManager(false);
    }
  };

  const handleToggleStatus = async (supplier: AdminSupplier) => {
    try {
      const { error } = await supabase
        .from("suppliers")
        .update({ is_active: !supplier.is_active } as any)
        .eq("id", supplier.id);

      if (error) throw error;
      toast.success(supplier.is_active ? "Магазин деактивовано" : "Магазин активовано");
      fetchSuppliers();
    } catch (err) {
      toast.error("Помилка зміни статусу");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {suppliers.length} магазинів зареєстровано
        </p>
      </div>

      {/* Instructions */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Керування магазинами</p>
              <p className="text-xs text-muted-foreground">
                Тут ви можете керувати всіма магазинами платформи: призначати менеджерів, 
                передавати право власності реальним постачальникам через Telegram ID, 
                та активувати/деактивувати магазини.
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  <strong>Передача магазину:</strong> Натисніть «Передати» → введіть Telegram ID нового власника → 
                  йому буде автоматично надано роль «supplier» та доступ до панелі партнера.
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Менеджер:</strong> Telegram нікнейм менеджера, який отримуватиме сповіщення від бота 
                  про нові замовлення та звернення клієнтів.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-480px)]">
        <div className="space-y-3 pr-4">
          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Немає зареєстрованих магазинів</p>
              <p className="text-xs text-muted-foreground mt-1">
                Зареєструйте постачальника у вкладці «Реєстрація»
              </p>
            </div>
          ) : (
            suppliers.map((supplier) => (
              <Card key={supplier.id} className="overflow-hidden">
                {/* Mini cover */}
                {supplier.cover_image_url && (
                  <div className="h-16 w-full overflow-hidden">
                    <img src={supplier.cover_image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border-2 border-background shadow">
                      <AvatarImage src={supplier.logo_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {supplier.shop_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{supplier.shop_name}</h3>
                        <Badge variant={supplier.is_active ? "default" : "secondary"} className="text-xs flex-shrink-0">
                          {supplier.is_active ? "Активний" : "Неактивний"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{supplier.company_name}</p>
                      {supplier.tax_code && (
                        <p className="text-xs text-muted-foreground">ЄДРПОУ: {supplier.tax_code}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Націнка: {supplier.markup_percentage || 33}%</span>
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {supplier.product_count || 0} товарів
                        </span>
                        {supplier.manager_telegram && (
                          <span className="text-primary">
                            <Bot className="h-3 w-3 inline mr-0.5" />
                            {supplier.manager_telegram}
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={supplier.is_active}
                      onCheckedChange={() => handleToggleStatus(supplier)}
                    />
                  </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={() => navigate(`/store-management/${supplier.id}`)}
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Керувати
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          setEditManagerDialog({ supplier });
                          setManagerTelegram(supplier.manager_telegram || "");
                        }}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          setTransferDialog({ supplier });
                          setTransferTelegramId("");
                        }}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => navigate(`/supplier/${supplier.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Transfer Ownership Dialog */}
      <Dialog open={!!transferDialog} onOpenChange={() => setTransferDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Передача магазину
            </DialogTitle>
            <DialogDescription>
              Передайте право власності магазину «{transferDialog?.supplier.shop_name}» 
              реальному постачальнику через його Telegram ID.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-xs text-foreground font-medium mb-1">Як отримати Telegram ID?</p>
              <p className="text-xs text-muted-foreground">
                1. Попросіть менеджера магазину відкрити нашого бота (@taverna_ukr_bot)<br />
                2. Бот автоматично запропонує «Передати Telegram ID для авторизації»<br />
                3. Менеджер отримає свій ID та зможе повідомити його вам<br />
                4. Введіть ID нижче та натисніть «Передати»
              </p>
            </div>

            <div className="space-y-2">
              <Label>Telegram ID нового власника</Label>
              <Input
                value={transferTelegramId}
                onChange={e => setTransferTelegramId(e.target.value.replace(/\D/g, ""))}
                placeholder="123456789"
                type="text"
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                Користувач автоматично отримає роль «supplier» і доступ до панелі партнера та керування магазином.
              </p>
            </div>

            <div className="p-3 bg-primary/5 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Що відбудеться:</strong>
              </p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc pl-4">
                <li>Користувачу буде надано роль «supplier»</li>
                <li>Менеджер магазину буде оновлено</li>
                <li>Новий власник побачить магазин у «Керування магазином»</li>
                <li>Ви залишите доступ як адмін</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(null)}>
              Скасувати
            </Button>
            <Button
              onClick={handleTransferOwnership}
              disabled={isTransferring || !transferTelegramId.trim()}
              className="gap-2"
            >
              {isTransferring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Передати магазин
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Manager Dialog */}
      <Dialog open={!!editManagerDialog} onOpenChange={() => setEditManagerDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Менеджер магазину
            </DialogTitle>
            <DialogDescription>
              Призначте менеджера для «{editManagerDialog?.supplier.shop_name}» — 
              він отримуватиме сповіщення про замовлення та звернення через бота.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Telegram нікнейм менеджера</Label>
              <Input
                value={managerTelegram}
                onChange={e => setManagerTelegram(e.target.value)}
                placeholder="@manager_username"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditManagerDialog(null)}>
              Скасувати
            </Button>
            <Button onClick={handleSaveManager} disabled={isSavingManager} className="gap-2">
              {isSavingManager ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
