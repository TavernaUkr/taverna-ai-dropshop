import { cn } from "@/lib/utils";
import { ElementType } from "react";
import { motion } from "framer-motion";

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
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 text-left",
        "bg-gradient-to-br",
        gradient,
        "text-primary-foreground",
        "shadow-lg hover:shadow-xl",
        "min-h-[110px] w-full",
        "transform-gpu"
      )}
    >
      {/* Premium Background Pattern */}
      <div className="absolute inset-0 opacity-[0.12]">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white blur-sm" />
        <div className="absolute -right-10 -top-10 w-24 h-24 rounded-full bg-white/80 blur-md" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-xl" />
      </div>

      {/* Shimmer Effect */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner border border-white/10">
          <Icon className="h-5 w-5 drop-shadow-sm" />
        </div>
        
        <h3 className="font-bold text-sm tracking-tight">{name}</h3>
        
        {count !== undefined && (
          <p className="text-xs opacity-75 mt-1 font-medium">
            {count} товарів
          </p>
        )}
      </div>
    </motion.button>
  );
};
