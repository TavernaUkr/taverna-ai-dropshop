import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface City {
  Ref: string;
  Description: string;
  DescriptionRu: string;
  Present: string;
  Warehouses?: number;
}

interface CitySearchProps {
  value: string;
  cityRef: string;
  onSelect: (city: City) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export const CitySearch = ({
  value,
  cityRef,
  onSelect,
  label = "Місто",
  required = true,
  error,
}: CitySearchProps) => {
  const [search, setSearch] = useState(value || '');
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search cities
  useEffect(() => {
    if (search.length < 2 || search === value) {
      setCities([]);
      return;
    }

    const searchCities = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("nova-poshta", {
          body: { action: "searchCity", params: { query: search } },
        });

        if (!error && data?.data) {
          setCities(data.data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("City search error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchCities, 300);
    return () => clearTimeout(debounce);
  }, [search, value]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (city: City) => {
    setSearch(city.Description);
    setCities([]);
    setIsOpen(false);
    onSelect(city);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value !== value) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (cities.length > 0) setIsOpen(true);
          }}
          placeholder="Почніть вводити назву міста..."
          className={cn(
            "pl-10 pr-10",
            error ? "border-destructive" : ""
          )}
        />
        {cityRef && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
        )}

        {/* Dropdown */}
        {isOpen && cities.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {cities.map((city) => (
              <button
                key={city.Ref}
                type="button"
                onClick={() => handleSelect(city)}
                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {city.Description}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {city.Present}
                    </p>
                  </div>
                  {city.Warehouses && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {city.Warehouses} відд.
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
