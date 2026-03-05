import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useState } from "react";

const regions = [
  { code: "ua", label: "Україна", flag: "🇺🇦", active: true },
  { code: "pl", label: "Польща", flag: "🇵🇱", active: false },
  { code: "de", label: "Німеччина", flag: "🇩🇪", active: false },
  { code: "it", label: "Італія", flag: "🇮🇹", active: false },
  { code: "us", label: "США", flag: "🇺🇸", active: false },
];

interface RegionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegionSelectorModal({ isOpen, onClose }: RegionSelectorModalProps) {
  const [selected] = useState("ua");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">🚩 Регіон</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {regions.map((region) => (
            <div
              key={region.code}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                region.active
                  ? "cursor-pointer hover:bg-muted"
                  : "opacity-50 cursor-not-allowed"
              }`}
            >
              <span className="text-xl">{region.flag}</span>
              <span className="flex-1 font-medium text-sm">{region.label}</span>
              {!region.active && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                  Скоро
                </Badge>
              )}
              {region.active && selected === region.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
