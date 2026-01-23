import { useState } from "react";
import { ArrowLeft, User, Phone, Mail, MapPin, Truck, Plus, Trash2, Check, X, ChevronRight, Edit2, Home, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { hapticImpact, hapticSelection } from "@/lib/haptics";

interface Profile {
  id: string;
  telegram_id: number;
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  user_type: 'customer' | 'supplier';
}

interface DeliveryAddress {
  id: string;
  is_default: boolean;
  recipient_name: string;
  phone: string;
  delivery_service: 'nova_poshta' | 'ukrposhta' | 'meest';
  city: string;
  delivery_type: 'warehouse' | 'postomat' | 'address';
  warehouse_number?: string;
  street_address?: string;
  building_number?: string;
  apartment?: string;
}

interface AccountSettingsProps {
  profile: Profile | null;
  addresses: DeliveryAddress[];
  onBack: () => void;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<any>;
  onAddAddress: (address: Omit<DeliveryAddress, 'id' | 'profile_id'>) => Promise<any>;
  onUpdateAddress: (id: string, updates: Partial<DeliveryAddress>) => Promise<any>;
  onDeleteAddress: (id: string) => Promise<boolean>;
}

type SettingsView = 'main' | 'personal' | 'addresses' | 'add-address';

export const AccountSettings = ({
  profile,
  addresses,
  onBack,
  onUpdateProfile,
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
}: AccountSettingsProps) => {
  const [view, setView] = useState<SettingsView>('main');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
  });

  const [newAddress, setNewAddress] = useState({
    recipient_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
    phone: profile?.phone || '',
    delivery_service: 'nova_poshta' as const,
    city: '',
    delivery_type: 'warehouse' as const,
    warehouse_number: '',
    is_default: addresses.length === 0,
  });

  const handleSaveProfile = async () => {
    const result = await onUpdateProfile(editData);
    if (result) {
      toast.success('Дані збережено');
      setIsEditing(false);
    } else {
      toast.error('Помилка збереження');
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.city || !newAddress.recipient_name || !newAddress.phone) {
      toast.error('Заповніть обов\'язкові поля');
      return;
    }

    const result = await onAddAddress(newAddress);
    if (result) {
      toast.success('Адресу додано');
      setView('addresses');
      setNewAddress({
        recipient_name: '',
        phone: '',
        delivery_service: 'nova_poshta',
        city: '',
        delivery_type: 'warehouse',
        warehouse_number: '',
        is_default: false,
      });
    } else {
      toast.error('Помилка додавання');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const result = await onDeleteAddress(id);
    if (result) {
      toast.success('Адресу видалено');
    } else {
      toast.error('Помилка видалення');
    }
  };

  const handleSetDefault = async (id: string) => {
    // First, remove default from all
    for (const addr of addresses) {
      if (addr.is_default && addr.id !== id) {
        await onUpdateAddress(addr.id, { is_default: false });
      }
    }
    // Set new default
    await onUpdateAddress(id, { is_default: true });
    toast.success('Адресу за замовчуванням оновлено');
  };

  const getDeliveryServiceName = (service: string) => {
    switch (service) {
      case 'nova_poshta': return 'Нова Пошта';
      case 'ukrposhta': return 'Укрпошта';
      case 'meest': return 'Meest';
      default: return service;
    }
  };

  const renderHeader = (title: string, showBack = true) => (
    <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-border p-4 flex items-center gap-3 z-10">
      {showBack && (
        <button
          onClick={() => view === 'main' ? onBack() : setView('main')}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h2 className="font-bold text-lg text-foreground">{title}</h2>
    </div>
  );

  // Main Settings View
  if (view === 'main') {
    return (
      <div className="fixed inset-0 z-50 bg-background animate-fade-in">
        {renderHeader('Налаштування')}
        
        <div className="p-4 space-y-3">
          {/* User Card */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-14 h-14 rounded-full" />
                ) : (
                  <span className="text-xl font-bold text-primary">
                    {profile?.first_name?.charAt(0) || 'Г'}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {profile?.first_name} {profile?.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  @{profile?.telegram_username || 'telegram'}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="bg-card rounded-xl overflow-hidden border border-border">
            <button
              onClick={() => setView('personal')}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted transition-colors border-b border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-foreground">Мої дані</span>
                <p className="text-xs text-muted-foreground">Ім'я, телефон, email</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => setView('addresses')}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-foreground">Адреси доставки</span>
                <p className="text-xs text-muted-foreground">{addresses.length} адрес(и)</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Personal Data View
  if (view === 'personal') {
    return (
      <div className="fixed inset-0 z-50 bg-background animate-fade-in">
        {renderHeader('Мої дані')}
        
        <div className="p-4 space-y-4">
          <div className="bg-card rounded-xl p-4 border border-border space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ім'я</label>
              <input
                type="text"
                value={editData.first_name}
                onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Прізвище</label>
              <input
                type="text"
                value={editData.last_name}
                onChange={(e) => setEditData(prev => ({ ...prev, last_name: e.target.value }))}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Телефон</label>
              <input
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={!isEditing}
                placeholder="+380 XX XXX XX XX"
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!isEditing}
                placeholder="email@example.com"
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground disabled:opacity-60"
              />
            </div>
          </div>

          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium"
              >
                Скасувати
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
              >
                Зберегти
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Редагувати
            </button>
          )}
        </div>
      </div>
    );
  }

  // Addresses View
  if (view === 'addresses') {
    const getAddressIcon = (type: string) => {
      return type === 'address' ? Home : Building2;
    };

    return (
      <div className="fixed inset-0 z-50 bg-background animate-fade-in">
        {renderHeader('Адреси доставки')}
        
        <div className="p-4 space-y-3">
          {/* Address Counter */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Збережені адреси</p>
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              addresses.length >= 3 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
            )}>
              {addresses.length}/3
            </span>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Немає збережених адрес</p>
              <p className="text-xs text-muted-foreground mt-1">Додайте адресу для швидкого оформлення</p>
            </div>
          ) : (
            addresses.map((address, index) => {
              const AddressIcon = getAddressIcon(address.delivery_type);
              
              return (
                <div
                  key={address.id}
                  className={cn(
                    "relative rounded-2xl p-4 border transition-all backdrop-blur-sm",
                    "bg-card/80 hover:shadow-md",
                    address.is_default 
                      ? "border-primary/50 bg-primary/5 shadow-sm" 
                      : "border-border hover:border-primary/30"
                  )}
                >
                  {/* Default Badge */}
                  {address.is_default && (
                    <div className="absolute -top-2 left-4">
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                        Основна
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3 pt-1">
                    {/* Address Type Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      address.is_default ? "bg-primary/20" : "bg-muted"
                    )}>
                      <AddressIcon className={cn(
                        "h-6 w-6",
                        address.is_default ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>

                    {/* Address Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          address.delivery_service === 'nova_poshta' && "bg-red-500/10 text-red-600",
                          address.delivery_service === 'ukrposhta' && "bg-amber-500/10 text-amber-600",
                          address.delivery_service === 'meest' && "bg-blue-500/10 text-blue-600"
                        )}>
                          {getDeliveryServiceName(address.delivery_service)}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground">{address.recipient_name}</p>
                      <p className="text-sm text-muted-foreground">{address.phone}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {address.city}
                        {address.warehouse_number && `, Відділення №${address.warehouse_number}`}
                        {address.street_address && `, ${address.street_address}`}
                        {address.building_number && ` ${address.building_number}`}
                        {address.apartment && `, кв. ${address.apartment}`}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {!address.is_default && (
                        <button
                          onClick={() => {
                            hapticImpact('light');
                            handleSetDefault(address.id);
                          }}
                          className="p-2.5 rounded-xl bg-muted/80 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all active:scale-95"
                          title="Зробити основною"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          hapticImpact('medium');
                          handleDeleteAddress(address.id);
                        }}
                        className="p-2.5 rounded-xl bg-muted/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all active:scale-95"
                        title="Видалити"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {addresses.length < 3 && (
            <button
              onClick={() => {
                hapticSelection();
                setView('add-address');
              }}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Plus className="h-5 w-5" />
              Додати адресу
            </button>
          )}
        </div>
      </div>
    );
  }

  // Add Address View
  if (view === 'add-address') {
    return (
      <div className="fixed inset-0 z-50 bg-background animate-fade-in overflow-auto">
        {renderHeader('Нова адреса')}
        
        <div className="p-4 pb-24 space-y-4">
          {/* Delivery Service */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Служба доставки</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'nova_poshta', name: 'Нова Пошта' },
                { id: 'ukrposhta', name: 'Укрпошта' },
                { id: 'meest', name: 'Meest' },
              ].map((service) => (
                <button
                  key={service.id}
                  onClick={() => setNewAddress(prev => ({ ...prev, delivery_service: service.id as any }))}
                  className={cn(
                    "py-3 px-2 rounded-xl text-sm font-medium transition-all text-center",
                    newAddress.delivery_service === service.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {service.name}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Тип доставки</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'warehouse', name: 'Відділення' },
                { id: 'postomat', name: 'Поштомат' },
                { id: 'address', name: 'Адреса' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setNewAddress(prev => ({ ...prev, delivery_type: type.id as any }))}
                  className={cn(
                    "py-3 px-2 rounded-xl text-sm font-medium transition-all",
                    newAddress.delivery_type === type.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Отримувач *</label>
            <input
              type="text"
              value={newAddress.recipient_name}
              onChange={(e) => setNewAddress(prev => ({ ...prev, recipient_name: e.target.value }))}
              placeholder="ПІБ отримувача"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Телефон *</label>
            <input
              type="tel"
              value={newAddress.phone}
              onChange={(e) => setNewAddress(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+380 XX XXX XX XX"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground"
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Місто *</label>
            <input
              type="text"
              value={newAddress.city}
              onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
              placeholder="Введіть місто"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground"
            />
          </div>

          {/* Warehouse Number */}
          {(newAddress.delivery_type === 'warehouse' || newAddress.delivery_type === 'postomat') && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Номер {newAddress.delivery_type === 'warehouse' ? 'відділення' : 'поштомату'}
              </label>
              <input
                type="text"
                value={newAddress.warehouse_number}
                onChange={(e) => setNewAddress(prev => ({ ...prev, warehouse_number: e.target.value }))}
                placeholder="Наприклад: 1"
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground"
              />
            </div>
          )}

          {/* Default checkbox */}
          <label className="flex items-center gap-3 p-4 bg-muted rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={newAddress.is_default}
              onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">Використовувати за замовчуванням</span>
          </label>

          <button
            onClick={handleAddAddress}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            Зберегти адресу
          </button>
        </div>
      </div>
    );
  }

  return null;
};