import { useState } from "react";
import { X, ChevronRight, ArrowLeft } from "lucide-react";
import { Shield, Shirt, Watch, Footprints, Backpack, Target, Car, Gamepad, Gift, Home, Smartphone, Baby } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  gradient: string;
  subcategories?: { id: string; name: string; count: number }[];
}

interface AllCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (categoryId: string, subcategoryId?: string) => void;
}

const allCategories: Category[] = [
  { 
    id: "military", 
    name: "Мілітарі", 
    icon: <Shield className="h-5 w-5" />, 
    count: 156, 
    gradient: "from-[#4a5d23] to-[#6b7b3e]",
    subcategories: [
      { id: "military-clothes", name: "Одяг", count: 45 },
      { id: "military-boots", name: "Взуття", count: 32 },
      { id: "military-accessories", name: "Аксесуари", count: 28 },
      { id: "military-headwear", name: "Головні убори", count: 18 },
      { id: "military-tactical", name: "Тактичне спорядження", count: 33 },
    ]
  },
  { 
    id: "clothing", 
    name: "Одяг", 
    icon: <Shirt className="h-5 w-5" />, 
    count: 234, 
    gradient: "from-primary to-primary/70",
    subcategories: [
      { id: "clothing-men", name: "Чоловічий", count: 120 },
      { id: "clothing-women", name: "Жіночий", count: 80 },
      { id: "clothing-kids", name: "Дитячий", count: 34 },
    ]
  },
  { 
    id: "accessories", 
    name: "Аксесуари", 
    icon: <Watch className="h-5 w-5" />, 
    count: 89, 
    gradient: "from-accent to-accent/70",
    subcategories: [
      { id: "accessories-watches", name: "Годинники", count: 25 },
      { id: "accessories-glasses", name: "Окуляри", count: 18 },
      { id: "accessories-belts", name: "Ремені", count: 22 },
      { id: "accessories-other", name: "Інше", count: 24 },
    ]
  },
  { 
    id: "footwear", 
    name: "Взуття", 
    icon: <Footprints className="h-5 w-5" />, 
    count: 67, 
    gradient: "from-[#5a4a3a] to-[#7a6a5a]",
    subcategories: [
      { id: "footwear-boots", name: "Берці", count: 25 },
      { id: "footwear-sneakers", name: "Кросівки", count: 22 },
      { id: "footwear-sandals", name: "Сандалі", count: 20 },
    ]
  },
  { 
    id: "bags", 
    name: "Сумки та рюкзаки", 
    icon: <Backpack className="h-5 w-5" />, 
    count: 45, 
    gradient: "from-[#3a4a5a] to-[#5a6a7a]",
    subcategories: [
      { id: "bags-backpacks", name: "Рюкзаки", count: 25 },
      { id: "bags-tactical", name: "Тактичні сумки", count: 12 },
      { id: "bags-everyday", name: "Повсякденні", count: 8 },
    ]
  },
  { 
    id: "tactical", 
    name: "Тактика", 
    icon: <Target className="h-5 w-5" />, 
    count: 112, 
    gradient: "from-[#2a3a2a] to-[#4a5a4a]" 
  },
  { 
    id: "auto", 
    name: "Авто", 
    icon: <Car className="h-5 w-5" />, 
    count: 78, 
    gradient: "from-[#3a3a4a] to-[#5a5a6a]" 
  },
  { 
    id: "gaming", 
    name: "Ігри та розваги", 
    icon: <Gamepad className="h-5 w-5" />, 
    count: 56, 
    gradient: "from-[#4a3a5a] to-[#6a5a7a]" 
  },
  { 
    id: "gifts", 
    name: "Подарунки", 
    icon: <Gift className="h-5 w-5" />, 
    count: 43, 
    gradient: "from-warning to-warning/70" 
  },
  { 
    id: "home", 
    name: "Дім та сад", 
    icon: <Home className="h-5 w-5" />, 
    count: 98, 
    gradient: "from-[#4a5a3a] to-[#6a7a5a]" 
  },
  { 
    id: "electronics", 
    name: "Електроніка", 
    icon: <Smartphone className="h-5 w-5" />, 
    count: 134, 
    gradient: "from-[#3a4a5a] to-[#5a6a7a]" 
  },
  { 
    id: "kids", 
    name: "Дитячі товари", 
    icon: <Baby className="h-5 w-5" />, 
    count: 67, 
    gradient: "from-[#5a4a6a] to-[#7a6a8a]" 
  },
];

export const AllCategoriesModal = ({ isOpen, onClose, onSelectCategory }: AllCategoriesModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  if (!isOpen) return null;

  const handleCategoryClick = (category: Category) => {
    if (category.subcategories && category.subcategories.length > 0) {
      setSelectedCategory(category);
    } else {
      onSelectCategory(category.id);
      onClose();
    }
  };

  const handleSubcategoryClick = (categoryId: string, subcategoryId: string) => {
    onSelectCategory(categoryId, subcategoryId);
    onClose();
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center gap-3">
        <button
          onClick={selectedCategory ? handleBack : onClose}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-bold text-lg text-foreground">
          {selectedCategory ? selectedCategory.name : "Всі категорії"}
        </h2>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {selectedCategory ? (
          // Subcategories View
          <div className="space-y-2">
            {/* All in category */}
            <button
              onClick={() => onSelectCategory(selectedCategory.id)}
              className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/50 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white",
                  selectedCategory.gradient
                )}>
                  {selectedCategory.icon}
                </div>
                <div className="text-left">
                  <span className="font-medium text-foreground">Всі товари</span>
                  <p className="text-xs text-muted-foreground">{selectedCategory.count} товарів</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Subcategories */}
            {selectedCategory.subcategories?.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSubcategoryClick(selectedCategory.id, sub.id)}
                className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/50 flex items-center justify-between transition-all"
              >
                <div className="text-left">
                  <span className="font-medium text-foreground">{sub.name}</span>
                  <p className="text-xs text-muted-foreground">{sub.count} товарів</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : (
          // All Categories View
          <div className="grid grid-cols-2 gap-3">
            {allCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className={cn(
                  "relative overflow-hidden rounded-xl p-4 text-left",
                  "bg-gradient-to-br",
                  category.gradient,
                  "text-white",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  "transition-transform duration-200",
                  "shadow-md hover:shadow-lg",
                  "min-h-[100px]"
                )}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/20" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-sm">{category.name}</h3>
                  <p className="text-xs opacity-80 mt-0.5">{category.count} товарів</p>
                  {category.subcategories && (
                    <ChevronRight className="absolute top-4 right-3 h-4 w-4 opacity-60" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
