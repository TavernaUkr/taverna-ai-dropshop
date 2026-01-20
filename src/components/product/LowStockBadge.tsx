import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface LowStockBadgeProps {
  quantity: number;
  threshold?: number;
  className?: string;
  animated?: boolean;
}

export const LowStockBadge = ({ 
  quantity, 
  threshold = 5, 
  className,
  animated = true 
}: LowStockBadgeProps) => {
  if (quantity > threshold || quantity <= 0) return null;

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        "bg-live/90 text-live-foreground shadow-md",
        animated && "animate-pulse",
        className
      )}
    >
      <Flame className="h-3 w-3" />
      <span>
        {quantity === 1 
          ? "Останній!" 
          : `Залишилось ${quantity} шт!`
        }
      </span>
    </div>
  );
};
