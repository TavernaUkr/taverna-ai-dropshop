import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Banknote, CreditCard, Bitcoin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "prepayment" | "full" | "crypto" | "cash";

interface PaymentMethodSelectProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  error?: string;
}

const paymentMethods: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: typeof Banknote;
  disabled?: boolean;
}[] = [
  {
    id: "cash",
    label: "Оплата при отриманні",
    description: "Готівкою або карткою на пошті",
    icon: Banknote,
  },
  {
    id: "prepayment",
    label: "Передоплата 50%",
    description: "Половина суми зараз, решта при отриманні",
    icon: CreditCard,
    disabled: true,
  },
  {
    id: "full",
    label: "Повна оплата",
    description: "Онлайн оплата карткою Visa/Mastercard",
    icon: CreditCard,
    disabled: true,
  },
  {
    id: "crypto",
    label: "Криптовалюта",
    description: "Bitcoin, Ethereum, USDT та інші",
    icon: Bitcoin,
    disabled: true,
  },
];

export const PaymentMethodSelect = ({
  value,
  onChange,
  error,
}: PaymentMethodSelectProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-foreground">
        Спосіб оплати
        <span className="text-destructive ml-1">*</span>
      </Label>
      
      <RadioGroup
        value={value}
        onValueChange={(val) => onChange(val as PaymentMethod)}
        className="space-y-3"
      >
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = value === method.id;
          const isDisabled = method.disabled;

          return (
            <label
              key={method.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <RadioGroupItem
                value={method.id}
                disabled={isDisabled}
                className="sr-only"
              />
              
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  isSelected ? "bg-primary/20" : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              
              <div className="flex-1">
                <div className="font-medium text-foreground">{method.label}</div>
                <p className="text-sm text-muted-foreground">{method.description}</p>
                {isDisabled && (
                  <p className="text-xs text-warning mt-1">Скоро буде доступно</p>
                )}
              </div>
              
              {isSelected && <Check className="h-5 w-5 text-primary" />}
            </label>
          );
        })}
      </RadioGroup>

      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
};
