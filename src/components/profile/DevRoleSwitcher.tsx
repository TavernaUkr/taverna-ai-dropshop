import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bug, X } from "lucide-react";

type TestRole = "guest" | "customer" | "supplier" | "moderator" | "admin";

interface DevRoleSwitcherProps {
  currentRole: TestRole;
  onRoleChange: (role: TestRole) => void;
}

export const DevRoleSwitcher = ({ currentRole, onRoleChange }: DevRoleSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const roleLabels: Record<TestRole, { label: string; color: string }> = {
    guest: { label: "👤 Гість", color: "bg-muted text-muted-foreground" },
    customer: { label: "🛒 Клієнт", color: "bg-blue-500/10 text-blue-500" },
    supplier: { label: "📦 Постачальник", color: "bg-primary/10 text-primary" },
    moderator: { label: "🛡️ Модератор", color: "bg-orange-500/10 text-orange-500" },
    admin: { label: "⚙️ Адмін", color: "bg-destructive/10 text-destructive" },
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 p-2 bg-muted/80 backdrop-blur-sm rounded-full shadow-lg border border-border hover:bg-muted transition-colors"
        title="Dev: Role Switcher"
      >
        <Bug className="h-5 w-5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 bg-card/95 backdrop-blur-sm rounded-xl shadow-xl border border-border p-4 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">🔧 DEV MODE</span>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-muted rounded-md transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Поточна роль:</p>
          <Badge className={roleLabels[currentRole].color}>
            {roleLabels[currentRole].label}
          </Badge>
        </div>

        <Select value={currentRole} onValueChange={(v) => onRoleChange(v as TestRole)}>
          <SelectTrigger className="w-full h-9 text-sm">
            <SelectValue placeholder="Обрати роль" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="guest">👤 Гість</SelectItem>
            <SelectItem value="customer">🛒 Клієнт</SelectItem>
            <SelectItem value="supplier">📦 Постачальник</SelectItem>
            <SelectItem value="moderator">🛡️ Модератор</SelectItem>
            <SelectItem value="admin">⚙️ Адмін</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-[10px] text-muted-foreground leading-tight">
          Це тестовий перемикач для розробки. Реальні ролі керуються через API бекенду.
        </p>
      </div>
    </div>
  );
};
