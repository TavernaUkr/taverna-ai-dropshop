import { useState, useEffect } from "react";
import { ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { Shield, Shirt, Watch, Footprints, Backpack, Target, Car, Gamepad, Gift, Home, Smartphone, Baby } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

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
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch categories from database
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, parent_id, product_count, is_active')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Build hierarchical structure
          const parentCategories = data.filter(c => !c.parent_id);
          const childCategories = data.filter(c => c.parent_id);
          
          const categoriesWithSubs: Category[] = parentCategories.map(parent => {
            const subs = childCategories
              .filter(c => c.parent_id === parent.id)
              .map(c => ({ id: c.id, name: c.name, count: c.product_count || 0 }));
            
            // Map to icon based on slug
            const iconMap: Record<string, React.ReactNode> = {
              'military': <Shield className="h-5 w-5" />,
              'clothing': <Shirt className="h-5 w-5" />,
              'accessories': <Watch className="h-5 w-5" />,
              'footwear': <Footprints className="h-5 w-5" />,
              'bags': <Backpack className="h-5 w-5" />,
              'tactical': <Target className="h-5 w-5" />,
              'auto': <Car className="h-5 w-5" />,
              'gaming': <Gamepad className="h-5 w-5" />,
              'gifts': <Gift className="h-5 w-5" />,
              'home': <Home className="h-5 w-5" />,
              'electronics': <Smartphone className="h-5 w-5" />,
              'kids': <Baby className="h-5 w-5" />,
            };
            
            const gradientMap: Record<string, string> = {
              'military': 'from-[#4a5d23] to-[#6b7b3e]',
              'clothing': 'from-primary to-primary/70',
              'accessories': 'from-accent to-accent/70',
              'footwear': 'from-[#5a4a3a] to-[#7a6a5a]',
              'bags': 'from-[#3a4a5a] to-[#5a6a7a]',
              'tactical': 'from-[#2a3a2a] to-[#4a5a4a]',
              'auto': 'from-[#3a3a4a] to-[#5a5a6a]',
              'gaming': 'from-[#4a3a5a] to-[#6a5a7a]',
              'gifts': 'from-warning to-warning/70',
              'home': 'from-[#4a5a3a] to-[#6a7a5a]',
              'electronics': 'from-[#3a4a5a] to-[#5a6a7a]',
              'kids': 'from-[#5a4a6a] to-[#7a6a8a]',
            };
            
            return {
              id: parent.id,
              name: parent.name,
              icon: iconMap[parent.slug] || <Target className="h-5 w-5" />,
              count: parent.product_count || 0,
              gradient: gradientMap[parent.slug] || 'from-primary to-primary/70',
              subcategories: subs.length > 0 ? subs : undefined,
            };
          });
          
          setDbCategories(categoriesWithSubs);
        } else {
          // Fallback to static categories if no DB data
          setDbCategories(allCategories);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setDbCategories(allCategories);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, [isOpen]);

  if (!isOpen) return null;

  const categoriesToShow = dbCategories.length > 0 ? dbCategories : allCategories;

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
    <div className="fixed inset-0 z-50 bg-background animate-fade-in flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center gap-3 shrink-0">
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

      {/* Content with ScrollArea */}
      <ScrollArea className="flex-1">
        <div className="p-4 pb-24">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedCategory ? (
            // Subcategories View
            <div className="space-y-2">
              {/* All in category */}
              <button
                onClick={() => {
                  onSelectCategory(selectedCategory.id);
                  onClose();
                }}
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
              {categoriesToShow.map((category) => (
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
      </ScrollArea>
    </div>
  );
};
