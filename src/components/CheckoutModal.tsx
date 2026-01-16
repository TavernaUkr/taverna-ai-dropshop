import { useState, useEffect } from 'react';
import { X, MapPin, Plus, Check, Loader2, CreditCard, Banknote, ChevronRight, ShoppingBag, Truck, UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AddressForm, AddressData } from './AddressForm';
import { GuestCheckoutForm, GuestCheckoutData } from './GuestCheckoutForm';
import { useTelegramAuthContext } from './TelegramAuthProvider';
import { CartItem } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderComplete: (orderId: string) => void;
}

type CheckoutStep = 'address' | 'payment' | 'confirm';
type PaymentMethod = 'card' | 'cash';

export function CheckoutModal({ isOpen, onClose, items, onOrderComplete }: CheckoutModalProps) {
  const { isAuthenticated, profile, addresses, addAddress, sessionToken } = useTelegramAuthContext();
  const [step, setStep] = useState<CheckoutStep>('address');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  
  // Guest checkout state
  const [guestData, setGuestData] = useState<GuestCheckoutData | null>(null);
  const [isGuestFormValid, setIsGuestFormValid] = useState(false);

  // Initialize selected address when addresses change
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find(a => a.is_default);
      setSelectedAddressId(defaultAddr?.id || addresses[0]?.id || null);
    }
  }, [addresses, selectedAddressId]);

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCost = 70; // Nova Poshta base delivery
  const grandTotal = totalPrice + deliveryCost;

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('address');
      setIsAddingAddress(false);
      setOrderNotes('');
      if (!isAuthenticated) {
        setGuestData(null);
        setIsGuestFormValid(false);
      }
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const handleAddAddress = async (addressData: AddressData) => {
    const result = await addAddress({
      ...addressData,
      is_default: addresses.length === 0,
    });
    
    if (result) {
      setSelectedAddressId(result.id);
      setIsAddingAddress(false);
      toast.success('Адресу додано');
    } else {
      toast.error('Помилка збереження адреси');
    }
  };

  const handleGuestDataChange = (data: GuestCheckoutData, isValid: boolean) => {
    setGuestData(data);
    setIsGuestFormValid(isValid);
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);

    try {
      if (isAuthenticated && sessionToken) {
        // Authenticated user order
        if (!selectedAddress) {
          toast.error('Оберіть адресу доставки');
          return;
        }

        const { data, error } = await supabase.functions.invoke('telegram-auth', {
          body: {
            action: 'create_order',
            session_token: sessionToken,
            order: {
              delivery_address_id: selectedAddressId,
              payment_method: paymentMethod,
              delivery_cost: deliveryCost,
              subtotal: totalPrice,
              total: grandTotal,
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
            },
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
        if (!guestData || !isGuestFormValid) {
          toast.error('Заповніть всі обов\'язкові поля');
          return;
        }

        const { data, error } = await supabase.functions.invoke('telegram-auth', {
          body: {
            action: 'create_guest_order',
            guest_info: guestData,
            order: {
              payment_method: paymentMethod,
              delivery_cost: deliveryCost,
              subtotal: totalPrice,
              total: grandTotal,
              notes: guestData.notes || orderNotes || null,
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
            },
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

  // Check if can proceed from address step
  const canProceedFromAddress = () => {
    if (isAuthenticated) {
      return !!selectedAddressId || isAddingAddress;
    }
    return isGuestFormValid;
  };

  const renderAddressStep = () => {
    // Guest checkout flow
    if (!isAuthenticated) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <UserCircle2 className="h-6 w-6 text-muted-foreground" />
            <div>
              <h3 className="font-medium text-foreground">Оформлення як гість</h3>
              <p className="text-xs text-muted-foreground">Заповніть форму для доставки</p>
            </div>
          </div>

          <GuestCheckoutForm 
            onDataChange={handleGuestDataChange}
            initialData={guestData || undefined}
          />

          <Button
            onClick={() => setStep('payment')}
            className="w-full"
            disabled={!isGuestFormValid}
          >
            Продовжити
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      );
    }

    // Authenticated user flow
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-foreground">Адреса доставки</h3>

        {isAddingAddress ? (
          <AddressForm
            onSubmit={handleAddAddress}
            onCancel={() => setIsAddingAddress(false)}
          />
        ) : (
          <>
            {addresses.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Немає збережених адрес</p>
                <Button onClick={() => setIsAddingAddress(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Додати адресу
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <button
                      key={address.id}
                      onClick={() => setSelectedAddressId(address.id)}
                      className={cn(
                        'w-full p-4 rounded-xl border text-left transition-all',
                        selectedAddressId === address.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                          selectedAddressId === address.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        )}>
                          {selectedAddressId === address.id && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{address.recipient_name}</span>
                            {address.is_default && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                Основна
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {address.city}
                            {address.delivery_type === 'warehouse' && address.warehouse_number && (
                              <>, Відділення №{address.warehouse_number}</>
                            )}
                            {address.delivery_type === 'courier' && address.street_address && (
                              <>, {address.street_address} {address.building_number}
                              {address.apartment && `, кв. ${address.apartment}`}</>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{address.phone}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setIsAddingAddress(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Додати нову адресу
                </Button>
              </>
            )}

            {addresses.length > 0 && selectedAddressId && (
              <Button
                onClick={() => setStep('payment')}
                className="w-full"
              >
                Продовжити
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  const renderPaymentStep = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-foreground">Спосіб оплати</h3>

      <div className="space-y-3">
        <button
          onClick={() => setPaymentMethod('cash')}
          className={cn(
            'w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4',
            paymentMethod === 'cash'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          )}
        >
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            paymentMethod === 'cash' ? 'bg-primary/20' : 'bg-muted'
          )}>
            <Banknote className={cn(
              'h-6 w-6',
              paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          <div className="flex-1">
            <div className="font-medium text-foreground">Оплата при отриманні</div>
            <p className="text-sm text-muted-foreground">Готівкою або карткою на пошті</p>
          </div>
          {paymentMethod === 'cash' && (
            <Check className="h-5 w-5 text-primary" />
          )}
        </button>

        <button
          onClick={() => setPaymentMethod('card')}
          className={cn(
            'w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 opacity-50 cursor-not-allowed',
            paymentMethod === 'card'
              ? 'border-primary bg-primary/5'
              : 'border-border'
          )}
          disabled
        >
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-foreground">Онлайн оплата</div>
            <p className="text-sm text-muted-foreground">Скоро буде доступно</p>
          </div>
        </button>
      </div>

      {/* Order Notes - only for authenticated users (guests have notes in their form) */}
      {isAuthenticated && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Коментар до замовлення</label>
          <textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Додаткові побажання..."
            className="w-full h-20 p-3 rounded-lg border border-border bg-background text-sm resize-none"
          />
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('address')}
          className="flex-1"
        >
          Назад
        </Button>
        <Button
          onClick={() => setStep('confirm')}
          className="flex-1"
        >
          Продовжити
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Get delivery info for confirmation
  const getDeliveryInfo = () => {
    if (isAuthenticated && selectedAddress) {
      return {
        city: selectedAddress.city,
        details: selectedAddress.delivery_type === 'warehouse' && selectedAddress.warehouse_number
          ? `Відділення №${selectedAddress.warehouse_number}`
          : selectedAddress.street_address 
            ? `${selectedAddress.street_address} ${selectedAddress.building_number}${selectedAddress.apartment ? `, кв. ${selectedAddress.apartment}` : ''}`
            : '',
        recipient: `${selectedAddress.recipient_name}, ${selectedAddress.phone}`,
      };
    } else if (guestData) {
      return {
        city: guestData.city,
        details: guestData.delivery_type === 'warehouse' && guestData.warehouse_number
          ? `Відділення №${guestData.warehouse_number}`
          : guestData.street_address 
            ? `${guestData.street_address} ${guestData.building_number}${guestData.apartment ? `, кв. ${guestData.apartment}` : ''}`
            : '',
        recipient: `${guestData.recipient_name}, ${guestData.phone}`,
      };
    }
    return null;
  };

  const deliveryInfo = getDeliveryInfo();

  const renderConfirmStep = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-foreground">Підтвердження</h3>

      {/* Order Summary */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShoppingBag className="h-4 w-4" />
          Товари ({items.length})
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground truncate flex-1 mr-2">
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium text-foreground">
                {(item.price * item.quantity).toLocaleString()} ₴
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Address */}
      {deliveryInfo && (
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="h-4 w-4" />
            Доставка
          </div>
          <p className="text-sm text-muted-foreground">
            {deliveryInfo.city}
            {deliveryInfo.details && <>, {deliveryInfo.details}</>}
          </p>
          <p className="text-sm text-muted-foreground">{deliveryInfo.recipient}</p>
        </div>
      )}

      {/* Payment Method */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Banknote className="h-4 w-4" />
          Оплата
        </div>
        <p className="text-sm text-muted-foreground">
          {paymentMethod === 'cash' ? 'Оплата при отриманні' : 'Онлайн оплата'}
        </p>
      </div>

      {/* Price Summary */}
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Товари</span>
          <span className="text-foreground">{totalPrice.toLocaleString()} ₴</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Truck className="h-4 w-4" />
            Доставка
          </span>
          <span className="text-foreground">{deliveryCost} ₴</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
          <span className="text-foreground">До сплати</span>
          <span className="text-primary">{grandTotal.toLocaleString()} ₴</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('payment')}
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={cn(step === 'address' && 'text-primary font-medium')}>
                  {isAuthenticated ? 'Адреса' : 'Дані'}
                </span>
                <ChevronRight className="h-3 w-3" />
                <span className={cn(step === 'payment' && 'text-primary font-medium')}>Оплата</span>
                <ChevronRight className="h-3 w-3" />
                <span className={cn(step === 'confirm' && 'text-primary font-medium')}>Підтвердження</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'address' && renderAddressStep()}
          {step === 'payment' && renderPaymentStep()}
          {step === 'confirm' && renderConfirmStep()}
        </div>
      </div>
    </div>
  );
}
