import { useState } from "react";
import { UserPlus, Loader2, Package, Link2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { hapticNotification } from "@/lib/haptics";

interface ManualSupplierFormProps {
  onSuccess?: () => void;
}

export function ManualSupplierForm({ onSuccess }: ManualSupplierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMyDrop, setIsMyDrop] = useState(false);
  const [formData, setFormData] = useState({
    shop_name: "",
    company_name: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    legal_type: "individual" as "individual" | "company",
    tax_code: "",
    xml_url: "",
    telegram_channel_url: "",
    markup_percentage: 33,
    transfer_to_user: false,
    target_telegram_id: "",
    manager_telegram: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.shop_name || !formData.contact_name || !formData.contact_phone) {
      toast.error("Заповніть обов'язкові поля");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create supplier record
      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .insert({
          shop_name: formData.shop_name,
          company_name: formData.company_name || formData.shop_name,
          contact_name: formData.contact_name,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email || null,
          legal_type: formData.legal_type,
          tax_code: formData.tax_code || null,
          xml_url: formData.xml_url || null,
          telegram_channel_url: formData.telegram_channel_url || null,
          markup_percentage: formData.markup_percentage,
          manager_telegram: formData.manager_telegram || null,
          is_active: true,
        } as any)
        .select()
        .single();

      if (supplierError) throw supplierError;

      // If transfer to user is enabled and telegram ID provided
      if (formData.transfer_to_user && formData.target_telegram_id) {
        // Find user by telegram_id
        const { data: profile } = await (supabase
          .from("profiles_safe" as any)
          .select("id") as any)
          .eq("id", formData.target_telegram_id)
          .single();

        if (profile) {
          // Add supplier role to user
          await supabase
            .from("user_roles")
            .insert({ user_id: profile.id, role: "supplier" as any });

          toast.success(`Акаунт передано користувачу з ID ${formData.target_telegram_id}`);
        } else {
          toast.warning("Користувача не знайдено, але постачальника створено");
        }
      }

      // If MyDrop XML provided, trigger import
      if (isMyDrop && formData.xml_url) {
        await supabase.functions.invoke("parse-xml", {
          body: { 
            xml_url: formData.xml_url,
            supplier_id: supplier.id,
          },
        });
        toast.success("Імпорт товарів запущено");
      }

      hapticNotification("success");
      toast.success(`Постачальника "${formData.shop_name}" створено!`);
      
      // Reset form
      setFormData({
        shop_name: "",
        company_name: "",
        contact_name: "",
        contact_phone: "",
        contact_email: "",
        legal_type: "individual",
        tax_code: "",
        xml_url: "",
        telegram_channel_url: "",
        markup_percentage: 33,
        transfer_to_user: false,
        target_telegram_id: "",
        manager_telegram: "",
      });
      
      onSuccess?.();
    } catch (err: any) {
      console.error("Error creating supplier:", err);
      toast.error(err.message || "Помилка створення постачальника");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5" />
          Ручна реєстрація постачальника
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* MyDrop Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Постачальник з MyDrop</span>
            </div>
            <Switch checked={isMyDrop} onCheckedChange={setIsMyDrop} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Назва магазину *</Label>
              <Input
                value={formData.shop_name}
                onChange={(e) => setFormData(prev => ({ ...prev, shop_name: e.target.value }))}
                placeholder="Мій магазин"
              />
            </div>
            <div className="space-y-2">
              <Label>Компанія</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="ТОВ/ФОП"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Контактна особа *</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                placeholder="Іван Іванов"
              />
            </div>
            <div className="space-y-2">
              <Label>Телефон *</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="+380..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select
                value={formData.legal_type}
                onValueChange={(value: "individual" | "company") => 
                  setFormData(prev => ({ ...prev, legal_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">ФОП</SelectItem>
                  <SelectItem value="company">ТОВ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ЄДРПОУ / ІПН</Label>
              <Input
                value={formData.tax_code}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_code: e.target.value }))}
                placeholder="12345678"
              />
            </div>
            <div className="space-y-2">
              <Label>Націнка (%)</Label>
              <Input
                type="number"
                min={15}
                max={50}
                value={formData.markup_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, markup_percentage: parseInt(e.target.value) || 33 }))}
              />
            </div>
          </div>

          {/* XML URL for MyDrop */}
          {isMyDrop && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                XML URL (MyDrop)
              </Label>
              <Input
                value={formData.xml_url}
                onChange={(e) => setFormData(prev => ({ ...prev, xml_url: e.target.value }))}
                placeholder="https://mydrop.com.ua/export/..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Telegram канал</Label>
            <Input
              value={formData.telegram_channel_url}
              onChange={(e) => setFormData(prev => ({ ...prev, telegram_channel_url: e.target.value }))}
              placeholder="https://t.me/mychannel"
            />
          </div>

          {/* Manager Telegram */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Менеджер магазину (Telegram)
            </Label>
            <Input
              value={formData.manager_telegram}
              onChange={(e) => setFormData(prev => ({ ...prev, manager_telegram: e.target.value }))}
              placeholder="@manager_username"
            />
            <p className="text-xs text-muted-foreground">
              Менеджер отримуватиме сповіщення від бота про замовлення та звернення клієнтів
            </p>
          </div>

          {/* Transfer to user */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Передати акаунт користувачу</span>
              <Switch 
                checked={formData.transfer_to_user} 
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, transfer_to_user: checked }))}
              />
            </div>
            {formData.transfer_to_user && (
              <div className="space-y-2">
                <Label>Telegram ID користувача</Label>
                <Input
                  value={formData.target_telegram_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_telegram_id: e.target.value }))}
                  placeholder="123456789"
                />
                <p className="text-xs text-muted-foreground">
                  Користувач отримає роль "supplier" і доступ до панелі партнера
                </p>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Створити постачальника
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
