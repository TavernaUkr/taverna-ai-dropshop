import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Check, ChevronRight, ShoppingBag, Truck, User, Gift, Tag, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTelegramAuthContext } from './TelegramAuthProvider';
import { CartItem } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { hapticNotification } from '@/lib/haptics';

// Import new checkout components
import { CheckoutSteps, CheckoutStep } from './checkout/CheckoutSteps';
import { PhoneInput } from './checkout/PhoneInput';
import { CitySearch } from './checkout/CitySearch';
import { WarehouseSelect } from './checkout/WarehouseSelect';
import { PaymentMethodSelect, PaymentMethod } from './checkout/PaymentMethodSelect';
import { OrderSummary } from './checkout/OrderSummary';
import { 
  DeliveryServiceSelect, 
  DeliveryFields, 
  DeliveryService, 
  DeliveryType 
} from './checkout/DeliveryServiceSelect';
import { DeliveryEstimate } from './checkout/DeliveryEstimate';

const PROMO_STORAGE_KEY = "taverna_active_promo";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderComplete: (orderId: string) => void;
}

interface ContactData {
  firstName: string;
  lastName: string;
  phone: string;
}

interface DeliveryData {
  service: DeliveryService;
  deliveryType: DeliveryType;
  city: string;
  cityRef: string;
  warehouse: string;
  warehouseRef: string;
  postalCode: string;
  pickupPoint: string;
  courierAddress: string;
}

interface ActivePromo {
  code: string;
  discountPercent?: number;
  title?: string;
}

export function CheckoutModal({ isOpen, onClose, items, onOrderComplete }: CheckoutModalProps) {
  const { isAuthenticated, profile, sessionToken } = useTelegramAuthContext();
  
  // Step management
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('contact');
  const [completedSteps, setCompletedSteps] = useState<CheckoutStep[]>([]);
  
  // Contact data
  const [contactData, setContactData] = useState<ContactData>({
    firstName: '',
    lastName: '',
    phone: '',
  });
  
  // Delivery data
  const [deliveryData, setDeliveryData] = useState<DeliveryData>({
    service: 'nova_poshta',
    deliveryType: 'warehouse',
    city: '',
    cityRef: '',
    warehouse: '',
    warehouseRef: '',
    postalCode: '',
    pickupPoint: '',
    courierAddress: '',
  });
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [orderNotes, setOrderNotes] = useState('');
  
  // Promo & Bonuses
  const [activePromo, setActivePromo] = useState<ActivePromo | null>(null);
  const [bonusesToUse, setBonusesToUse] = useState(0);
  const [userBonusBalance] = useState(150); // Mock - will come from useBonuses hook
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate totals with discounts
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCost = 70;
  const promoDiscount = activePromo?.discountPercent ? Math.round(subtotal * activePromo.discountPercent / 100) : 0;
  const total = Math.max(0, subtotal + deliveryCost - promoDiscount - bonusesToUse);

  // Initialize with user data if authenticated
  useEffect(() => {
    if (isAuthenticated && profile) {
      setContactData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
      });
    }
  }, [isAuthenticated, profile]);

  // Count unique suppliers
  const uniqueSuppliers = new Set(items.map(i => i.supplierId).filter(Boolean));
  const isMultiSupplier = uniqueSuppliers.size > 1;

  // Reset state when modal opens and load promo from storage
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('contact');
      setCompletedSteps([]);
      setErrors({});
      setBonusesToUse(0);
      
      // Load promo from localStorage
      const storedPromo = localStorage.getItem(PROMO_STORAGE_KEY);
      if (storedPromo) {
        try {
          setActivePromo(JSON.parse(storedPromo));
        } catch {
          setActivePromo(null);
        }
      }
      
      if (!isAuthenticated) {
        setContactData({ firstName: '', lastName: '', phone: '' });
      }

      // Auto-select fulfillment for multi-supplier orders
      const autoService: DeliveryService = 'nova_poshta';
      const autoType: DeliveryType = isMultiSupplier ? 'fulfillment' : 'warehouse';

      // Pre-fill delivery data from saved profile if available
      if (isAuthenticated && profile) {
        setDeliveryData({
          service: autoService,
          deliveryType: autoType,
          city: profile.last_city || '',
          cityRef: profile.last_city_ref || '',
          warehouse: profile.last_warehouse || '',
          warehouseRef: profile.last_warehouse_ref || '',
          postalCode: '',
          pickupPoint: '',
          courierAddress: '',
        });
      } else {
        setDeliveryData({ 
          service: autoService,
          deliveryType: autoType,
          city: '', 
          cityRef: '', 
          warehouse: '', 
          warehouseRef: '',
          postalCode: '',
          pickupPoint: '',
          courierAddress: '',
        });
      }
      setPaymentMethod('cash');
      setOrderNotes('');
    }
  }, [isOpen, isAuthenticated, profile, isMultiSupplier]);

  if (!isOpen) return null;

  // Validation
  const validateContact = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!contactData.firstName.trim()) {
      newErrors.firstName = "Введіть ім'я";
    }
    if (!contactData.lastName.trim()) {
      newErrors.lastName = "Введіть прізвище";
    }
    if (!contactData.phone || contactData.phone.length !== 12) {
      newErrors.phone = "Введіть повний номер телефону";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDelivery = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Common validation for all services
    if (deliveryData.service === 'nova_poshta') {
      if (!deliveryData.cityRef) {
        newErrors.city = "Оберіть місто";
      }
      if ((deliveryData.deliveryType === 'warehouse' || 
           deliveryData.deliveryType === 'postomat' || 
           deliveryData.deliveryType === 'fulfillment') && 
          !deliveryData.warehouseRef) {
        newErrors.warehouse = "Оберіть відділення";
      }
      if (deliveryData.deliveryType === 'courier' && !deliveryData.courierAddress.trim()) {
        newErrors.courierAddress = "Введіть адресу доставки";
      }
    } else if (deliveryData.service === 'ukrposhta') {
      if (!deliveryData.postalCode || deliveryData.postalCode.length < 5) {
        newErrors.postalCode = "Введіть поштовий індекс";
      }
    } else if (deliveryData.service === 'rozetka' || deliveryData.service === 'meest') {
      if (!deliveryData.cityRef) {
        newErrors.city = "Оберіть місто";
      }
      if (deliveryData.deliveryType === 'warehouse' && !deliveryData.pickupPoint.trim()) {
        newErrors.pickupPoint = "Введіть точку видачі";
      }
      if (deliveryData.deliveryType === 'courier' && !deliveryData.courierAddress.trim()) {
        newErrors.courierAddress = "Введіть адресу доставки";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step navigation
  const goToStep = (step: CheckoutStep) => {
    setCurrentStep(step);
  };

  const handleNextFromContact = () => {
    if (validateContact()) {
      setCompletedSteps((prev) => [...prev.filter(s => s !== 'contact'), 'contact']);
      goToStep('delivery');
    }
  };

  const handleNextFromDelivery = () => {
    if (validateDelivery()) {
      setCompletedSteps((prev) => [...prev.filter(s => s !== 'delivery'), 'delivery']);
      goToStep('payment');
    }
  };

  const handleNextFromPayment = () => {
    setCompletedSteps((prev) => [...prev.filter(s => s !== 'payment'), 'payment']);
    goToStep('confirm');
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);

    try {
      const orderData = {
        payment_method: paymentMethod,
        delivery_cost: deliveryCost,
        subtotal: subtotal,
        total: total,
        notes: orderNotes || null,
        items: items.map(item => ({
          product_id: item.productId,
          product_name: item.name,
          product_image: item.image,
          price: item.price,
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
          total: item.price * item.quantity,
        })),
      };

      if (isAuthenticated && sessionToken) {
        // Authenticated order - first save address
        const { data, error } = await supabase.functions.invoke('telegram-auth', {
          body: {
            action: 'create_order',
            session_token: sessionToken,
            guest_info: {
              recipient_name: `${contactData.firstName} ${contactData.lastName}`,
              phone: contactData.phone,
              city: deliveryData.city,
              city_ref: deliveryData.cityRef,
              warehouse_number: deliveryData.warehouse,
              warehouse_ref: deliveryData.warehouseRef,
              delivery_type: 'warehouse',
              delivery_service: 'nova_poshta',
            },
            order: orderData,
          },
        });

        if (error) throw error;

        if (data?.success && data?.order) {
          toast.success(`Замовлення #${data.order.order_number} створено!`);
          onOrderComplete(data.order.id);
        } else {
          throw new Error(data?.error || 'Failed to create order');
        }
      } else {
        // Guest order
        const { data, error } = await supabase.functions.invoke('telegram-auth', {
          body: {
            action: 'create_guest_order',
            guest_info: {
              recipient_name: `${contactData.firstName} ${contactData.lastName}`,
              phone: contactData.phone,
              city: deliveryData.city,
              city_ref: deliveryData.cityRef,
              warehouse_number: deliveryData.warehouse,
              warehouse_ref: deliveryData.warehouseRef,
              delivery_type: 'warehouse',
              delivery_service: 'nova_poshta',
            },
            order: orderData,
          },
        });

        if (error) throw error;

        if (data?.success && data?.order) {
          toast.success(`Замовлення #${data.order.order_number} створено!`);
          onOrderComplete(data.order.id);
        } else {
          throw new Error(data?.error || 'Failed to create order');
        }
      }
    } catch (err) {
      console.error('Order creation error:', err);
      toast.error('Помилка створення замовлення');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Contact Step
  const renderContactStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
        <User className="h-6 w-6 text-muted-foreground" />
        <div>
          <h3 className="font-medium text-foreground">Контактні дані</h3>
          <p className="text-xs text-muted-foreground">
            {isAuthenticated ? 'Підтвердіть ваші дані' : 'Заповніть контактну інформацію'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Ім'я <span className="text-destructive">*</span>
          </Label>
          <Input
            value={contactData.firstName}
            onChange={(e) => setContactData(prev => ({ ...prev, firstName: e.target.value }))}
            placeholder="Олександр"
            className={errors.firstName ? 'border-destructive' : ''}
          />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Прізвище <span className="text-destructive">*</span>
          </Label>
          <Input
            value={contactData.lastName}
            onChange={(e) => setContactData(prev => ({ ...prev, lastName: e.target.value }))}
            placeholder="Шевченко"
            className={errors.lastName ? 'border-destructive' : ''}
          />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
        </div>
      </div>

      <PhoneInput
        value={contactData.phone}
        onChange={(phone) => setContactData(prev => ({ ...prev, phone }))}
        error={errors.phone}
      />

      <Button onClick={handleNextFromContact} className="w-full">
        Продовжити
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  // Render Delivery Step
  const renderDeliveryStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
        <Truck className="h-6 w-6 text-muted-foreground" />
        <div>
          <h3 className="font-medium text-foreground">Доставка</h3>
          <p className="text-xs text-muted-foreground">Оберіть службу та спосіб отримання</p>
        </div>
      </div>

      {/* Multi-supplier auto-fulfillment warning */}
      {isMultiSupplier && deliveryData.deliveryType !== 'fulfillment' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            ⚠️ Товари від {uniqueSuppliers.size} постачальників
          </p>
          <p className="text-xs text-muted-foreground">
            Обрано окрему доставку — кожна посилка оплачується окремо. 
            Рекомендуємо Фулфілмент НП для економії.
          </p>
          <button
            type="button"
            onClick={() => setDeliveryData(prev => ({ ...prev, service: 'nova_poshta', deliveryType: 'fulfillment' }))}
            className="text-xs font-medium text-primary hover:underline"
          >
            Обрати Фулфілмент НП →
          </button>
        </div>
      )}

      <DeliveryServiceSelect
        value={deliveryData.service}
        onChange={(service) => setDeliveryData(prev => ({ 
          ...prev, 
          service,
          warehouse: '',
          warehouseRef: '',
          pickupPoint: '',
        }))}
        deliveryType={deliveryData.deliveryType}
        onDeliveryTypeChange={(deliveryType) => setDeliveryData(prev => ({ 
          ...prev, 
          deliveryType,
          warehouse: '',
          warehouseRef: '',
        }))}
      />

      <DeliveryFields
        service={deliveryData.service}
        deliveryType={deliveryData.deliveryType}
        cityRef={deliveryData.cityRef}
        city={deliveryData.city}
        onCitySelect={(city) => {
          setDeliveryData(prev => ({
            ...prev,
            city: city.Description,
            cityRef: city.Ref,
            warehouse: '',
            warehouseRef: '',
          }));
        }}
        warehouseRef={deliveryData.warehouseRef}
        warehouseNumber={deliveryData.warehouse}
        onWarehouseSelect={(warehouse) => {
          setDeliveryData(prev => ({
            ...prev,
            warehouse: warehouse.Number,
            warehouseRef: warehouse.Ref,
          }));
        }}
        postalCode={deliveryData.postalCode}
        onPostalCodeChange={(code) => setDeliveryData(prev => ({ ...prev, postalCode: code }))}
        pickupPoint={deliveryData.pickupPoint}
        onPickupPointChange={(point) => setDeliveryData(prev => ({ ...prev, pickupPoint: point }))}
        courierAddress={deliveryData.courierAddress}
        onCourierAddressChange={(addr) => setDeliveryData(prev => ({ ...prev, courierAddress: addr }))}
        errors={errors}
      />

      {/* Delivery Estimate */}
      {deliveryData.cityRef && (
        <DeliveryEstimate
          service={deliveryData.service}
          type={deliveryData.deliveryType === 'warehouse' ? 'branch' : deliveryData.deliveryType === 'postomat' ? 'postomat' : deliveryData.deliveryType}
          city={deliveryData.city}
        />
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => goToStep('contact')} className="flex-1">
          Назад
        </Button>
        <Button onClick={handleNextFromDelivery} className="flex-1">
          Продовжити
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Payment Step
  const renderPaymentStep = () => (
    <div className="space-y-4">
      <PaymentMethodSelect
        value={paymentMethod}
        onChange={setPaymentMethod}
      />

      {/* Promo Code Display */}
      {activePromo && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium text-foreground">Промокод: {activePromo.code}</p>
                <p className="text-sm text-success">-{activePromo.discountPercent}% знижка</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setActivePromo(null);
                localStorage.removeItem(PROMO_STORAGE_KEY);
              }}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Видалити
            </button>
          </div>
        </div>
      )}

      {/* Bonus Points */}
      {isAuthenticated && userBonusBalance > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">Бонуси</span>
            </div>
            <span className="text-sm text-muted-foreground">Доступно: {userBonusBalance} ₴</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={Math.min(userBonusBalance, subtotal)}
              value={bonusesToUse || ''}
              onChange={(e) => setBonusesToUse(Math.min(Number(e.target.value) || 0, userBonusBalance, subtotal))}
              placeholder="0"
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setBonusesToUse(Math.min(userBonusBalance, subtotal))}
            >
              Макс
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Бонуси можна використовувати разом з промокодом
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Коментар до замовлення</Label>
        <textarea
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Додаткові побажання..."
          className="w-full h-20 p-3 rounded-lg border border-border bg-background text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => goToStep('delivery')} className="flex-1">
          Назад
        </Button>
        <Button onClick={handleNextFromPayment} className="flex-1">
          Продовжити
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Confirm Step
  const renderConfirmStep = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-foreground">Підтвердження замовлення</h3>

      <OrderSummary
        items={items}
        subtotal={subtotal}
        deliveryCost={deliveryCost}
        total={total}
      />

      {/* Delivery Info */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Truck className="h-4 w-4" />
          Доставка
        </div>
        <p className="text-sm text-muted-foreground">
          {deliveryData.city}, {deliveryData.warehouse}
        </p>
        <p className="text-sm text-muted-foreground">
          {contactData.firstName} {contactData.lastName}, +{contactData.phone}
        </p>
      </div>

      {/* Payment Info */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <div className="text-sm font-medium text-foreground">Оплата</div>
        <p className="text-sm text-muted-foreground">
          {paymentMethod === 'cash' && 'Оплата при отриманні'}
          {paymentMethod === 'card' && 'Картка Visa/Mastercard'}
          {paymentMethod === 'mono' && 'MonoPay'}
          {paymentMethod === 'applepay' && 'Apple Pay'}
          {paymentMethod === 'googlepay' && 'Google Pay'}
          {paymentMethod === 'telegram_wallet' && 'Telegram Wallet'}
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => goToStep('payment')}
          className="flex-1"
          disabled={isSubmitting}
        >
          Назад
        </Button>
        <Button
          onClick={handleSubmitOrder}
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Обробка...
            </>
          ) : (
            <>
              Замовити
              <Check className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 bg-background rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold text-lg text-foreground">
                {isAuthenticated ? 'Оформлення' : 'Оформлення (Гість)'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="p-4 border-b border-border">
          <CheckoutSteps currentStep={currentStep} completedSteps={completedSteps} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentStep === 'contact' && renderContactStep()}
          {currentStep === 'delivery' && renderDeliveryStep()}
          {currentStep === 'payment' && renderPaymentStep()}
          {currentStep === 'confirm' && renderConfirmStep()}
        </div>
      </div>
    </div>
  );
}
