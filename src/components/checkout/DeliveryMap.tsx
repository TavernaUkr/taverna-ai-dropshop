import { MapPin, Navigation, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DeliveryMapProps {
  onSelectBranch?: (branch: {
    id: string;
    name: string;
    address: string;
    service: string;
  }) => void;
}

export function DeliveryMap({ onSelectBranch }: DeliveryMapProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Placeholder branches for demonstration
  const branches = [
    { id: "1", name: "Відділення №1", address: "вул. Хрещатик, 22", service: "nova_poshta", city: "Київ" },
    { id: "2", name: "Відділення №5", address: "вул. Шевченка, 15", service: "nova_poshta", city: "Київ" },
    { id: "3", name: "Поштомат №123", address: "вул. Лесі Українки, 7", service: "nova_poshta", city: "Київ" },
  ];

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Пошук відділення..."
          className="pl-10"
        />
      </div>

      {/* Map Placeholder */}
      <div className="relative h-48 bg-muted/50 rounded-xl border border-border overflow-hidden">
        {/* Ukraine map silhouette placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Navigation className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Карта України</p>
            <p className="text-xs text-muted-foreground">
              Інтерактивна карта буде доступна після підключення API
            </p>
          </div>
        </div>

        {/* Decorative map dots */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-primary rounded-full animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-primary rounded-full animate-pulse delay-100" />
          <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-primary rounded-full animate-pulse delay-200" />
          <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-primary rounded-full animate-pulse delay-300" />
          <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-primary rounded-full animate-pulse delay-400" />
        </div>
      </div>

      {/* Branch List */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Найближчі відділення:</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {filteredBranches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => onSelectBranch?.(branch)}
              className="w-full flex items-start gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{branch.name}</p>
                <p className="text-xs text-muted-foreground truncate">{branch.address}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Service Logos */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-border">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-1">
            <span className="text-destructive font-bold text-xs">НП</span>
          </div>
          <span className="text-xs text-muted-foreground">Нова Пошта</span>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mx-auto mb-1">
            <span className="text-warning font-bold text-xs">УП</span>
          </div>
          <span className="text-xs text-muted-foreground">Укрпошта</span>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-1">
            <span className="text-accent font-bold text-xs">M</span>
          </div>
          <span className="text-xs text-muted-foreground">Meest</span>
        </div>
      </div>
    </div>
  );
}
