import { cn } from "@/lib/utils";
import { ElementType } from "react";

interface CategoryCardProps {
  name: string;
  icon: ElementType;
  count?: number;
  gradient?: string;
  onClick?: () => void;
}

export const CategoryCard = ({
  name,
  icon: Icon,
  count,
  gradient = "from-primary to-primary/80",
  onClick,
}: CategoryCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl p-4 text-left",
        "bg-gradient-to-br",
        gradient,
        "text-primary-foreground",
        "hover:scale-[1.02] active:scale-[0.98]",
        "transition-transform duration-200",
        "shadow-md hover:shadow-lg",
        "min-h-[100px] w-full"
      )}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/20" />
        <div className="absolute -right-8 -top-8 w-20 h-20 rounded-full bg-white/10" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
          <Icon className="h-5 w-5" />
        </div>
        
        <h3 className="font-semibold text-sm">{name}</h3>
        
        {count !== undefined && (
          <p className="text-xs opacity-80 mt-1">
            {count} товарів
          </p>
        )}
      </div>
    </button>
  );
};
