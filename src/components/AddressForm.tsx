import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, MapPin, Building2, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AddressFormProps {
  onSubmit: (address: AddressData) => Promise<void>;
  onCancel: () => void;
  initialData?: AddressData;
  isLoading?: boolean;
}

export interface AddressData {
  id?: string;
  recipient_name: string;
  phone: string;
  delivery_service: string;
  city: string;
  city_ref?: string;
  delivery_type: string;
  warehouse_number?: string;
  warehouse_ref?: string;
  street_address?: string;
  building_number?: string;
  apartment?: string;
  postal_code?: string;
  notes?: string;
  is_default?: boolean;
}

interface City {
  ref: string;
  name: string;
  area: string;
}

interface Warehouse {
  ref: string;
  number: string;
  description: string;
  address: string;
}

export function AddressForm({ onSubmit, onCancel, initialData, isLoading }: AddressFormProps) {
  const [formData, setFormData] = useState<AddressData>({
    recipient_name: initialData?.recipient_name || '',
    phone: initialData?.phone || '',
    delivery_service: initialData?.delivery_service || 'nova_poshta',
    city: initialData?.city || '',
    city_ref: initialData?.city_ref || '',
    delivery_type: initialData?.delivery_type || 'warehouse',
    warehouse_number: initialData?.warehouse_number || '',
    warehouse_ref: initialData?.warehouse_ref || '',
    street_address: initialData?.street_address || '',
    building_number: initialData?.building_number || '',
    apartment: initialData?.apartment || '',
    notes: initialData?.notes || '',
    is_default: initialData?.is_default || false,
  });

  const [cities, setCities] = useState<City[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [citySearch, setCitySearch] = useState(initialData?.city || '');
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Search cities
  useEffect(() => {
    const searchCities = async () => {
      if (citySearch.length < 2) {
        setCities([]);
        return;
      }

      setIsSearchingCities(true);
      try {
        const { data, error } = await supabase.functions.invoke('nova-poshta', {
          body: { action: 'searchCities', query: citySearch },
        });

        if (!error && data?.cities) {
          setCities(data.cities);
        }
      } catch (err) {
        console.error('City search error:', err);
      } finally {
        setIsSearchingCities(false);
      }
    };

    const debounce = setTimeout(searchCities, 300);
    return () => clearTimeout(debounce);
  }, [citySearch]);

  // Load warehouses when city is selected
  useEffect(() => {
    const loadWarehouses = async () => {
      if (!formData.city_ref) {
        setWarehouses([]);
        return;
      }

      setIsLoadingWarehouses(true);
      try {
        const { data, error } = await supabase.functions.invoke('nova-poshta', {
          body: { action: 'getWarehouses', cityRef: formData.city_ref },
        });

        if (!error && data?.warehouses) {
          setWarehouses(data.warehouses);
        }
      } catch (err) {
        console.error('Warehouses load error:', err);
      } finally {
        setIsLoadingWarehouses(false);
      }
    };

    if (formData.delivery_type === 'warehouse') {
      loadWarehouses();
    }
  }, [formData.city_ref, formData.delivery_type]);

  const handleCitySelect = (city: City) => {
    setFormData(prev => ({
      ...prev,
      city: city.name,
      city_ref: city.ref,
      warehouse_number: '',
      warehouse_ref: '',
    }));
    setCitySearch(city.name);
    setShowCityDropdown(false);
  };

  const handleWarehouseSelect = (warehouse: Warehouse) => {
    setFormData(prev => ({
      ...prev,
      warehouse_number: warehouse.number,
      warehouse_ref: warehouse.ref,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const isFormValid = () => {
    const basicValid = formData.recipient_name && formData.phone && formData.city;
    if (formData.delivery_type === 'warehouse') {
      return basicValid && formData.warehouse_number;
    }
    return basicValid && formData.street_address && formData.building_number;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Recipient Info */}
      <div className="space-y-4">
        <h3 className="font-medium text-foreground">Отримувач</h3>
        
        <div className="space-y-2">
          <Label htmlFor="recipient_name">ПІБ отримувача</Label>
          <Input
            id="recipient_name"
            value={formData.recipient_name}
            onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
            placeholder="Іванов Іван Іванович"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Телефон</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+380XXXXXXXXX"
            required
          />
        </div>
      </div>

      {/* Delivery Service */}
      <div className="space-y-4">
        <h3 className="font-medium text-foreground">Служба доставки</h3>
        
        <RadioGroup
          value={formData.delivery_service}
          onValueChange={(value) => setFormData(prev => ({ ...prev, delivery_service: value }))}
          className="grid grid-cols-2 gap-3"
        >
          <div className="flex items-center space-x-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted">
            <RadioGroupItem value="nova_poshta" id="nova_poshta" />
            <Label htmlFor="nova_poshta" className="cursor-pointer flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Нова Пошта
            </Label>
          </div>
          <div className="flex items-center space-x-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted opacity-50">
            <RadioGroupItem value="ukr_poshta" id="ukr_poshta" disabled />
            <Label htmlFor="ukr_poshta" className="cursor-pointer">Укрпошта</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Delivery Type */}
      <div className="space-y-4">
        <h3 className="font-medium text-foreground">Спосіб отримання</h3>
        
        <RadioGroup
          value={formData.delivery_type}
          onValueChange={(value) => setFormData(prev => ({ ...prev, delivery_type: value }))}
          className="grid grid-cols-2 gap-3"
        >
          <div className="flex items-center space-x-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted">
            <RadioGroupItem value="warehouse" id="warehouse" />
            <Label htmlFor="warehouse" className="cursor-pointer flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              На відділення
            </Label>
          </div>
          <div className="flex items-center space-x-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted">
            <RadioGroupItem value="courier" id="courier" />
            <Label htmlFor="courier" className="cursor-pointer flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Кур'єром
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* City Search */}
      <div className="space-y-2 relative">
        <Label htmlFor="city">Місто</Label>
        <div className="relative">
          <Input
            id="city"
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setShowCityDropdown(true);
            }}
            onFocus={() => setShowCityDropdown(true)}
            placeholder="Почніть вводити назву міста..."
            required
          />
          {isSearchingCities && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {showCityDropdown && cities.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {cities.map((city) => (
              <button
                key={city.ref}
                type="button"
                onClick={() => handleCitySelect(city)}
                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
              >
                <div className="font-medium text-sm">{city.name}</div>
                {city.area && (
                  <div className="text-xs text-muted-foreground">{city.area} обл.</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Warehouse Selection */}
      {formData.delivery_type === 'warehouse' && formData.city_ref && (
        <div className="space-y-2">
          <Label>Відділення</Label>
          {isLoadingWarehouses ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Завантаження відділень...</span>
            </div>
          ) : (
            <select
              value={formData.warehouse_ref || ''}
              onChange={(e) => {
                const warehouse = warehouses.find(w => w.ref === e.target.value);
                if (warehouse) handleWarehouseSelect(warehouse);
              }}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              required
            >
              <option value="">Оберіть відділення</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.ref} value={warehouse.ref}>
                  №{warehouse.number} - {warehouse.description}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Courier Address */}
      {formData.delivery_type === 'courier' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Вулиця</Label>
            <Input
              id="street"
              value={formData.street_address || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
              placeholder="вул. Хрещатик"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="building">Будинок</Label>
              <Input
                id="building"
                value={formData.building_number || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, building_number: e.target.value }))}
                placeholder="10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apartment">Квартира</Label>
              <Input
                id="apartment"
                value={formData.apartment || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, apartment: e.target.value }))}
                placeholder="25"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Примітка (необов'язково)</Label>
        <Input
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Додаткова інформація для кур'єра"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isLoading}
        >
          Скасувати
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={isLoading || !isFormValid()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Збереження...
            </>
          ) : (
            'Зберегти'
          )}
        </Button>
      </div>
    </form>
  );
}
