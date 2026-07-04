import { useState, useEffect, useCallback } from "react";
import {
  Wallet, Loader2, ArrowDownToLine, CreditCard, RefreshCw,
  TrendingUp, TrendingDown, Banknote, ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  supplierId: string;
  /** Force read-only (managers). When omitted, derived from server access level. */
  readOnly?: boolean;
}

const TYPE_META: Record<string, { label: string; positive: boolean }> = {
  payout_accrual: { label: "Нарахування за товар", positive: true },
  markup_debit: { label: "Наша націнка (наложений)", positive: false },
  withdrawal: { label: "Вивід коштів", positive: false },
  card_charge: { label: "Списання націнки з картки", positive: false },
  refund_adjust: { label: "Коригування повернення", positive: false },
  penalty: { label: "Штраф", positive: false },
};

export function SupplierBalanceCard({ supplierId, readOnly: readOnlyProp }: Props) {
  const { sessionToken } = useTelegramAuthContext();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<any>(null);
  const [method, setMethod] = useState<any>(null);
  const [providers, setProviders] = useState<{ monobank: string; liqpay: string }>({ monobank: "sandbox", liqpay: "sandbox" });
  const [movements, setMovements] = useState<any[]>([]);
  const [canManageServer, setCanManageServer] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");

  const load = useCallback(async () => {
    if (!sessionToken || !supplierId) return;
    setLoading(true);
    try {
      const [bal, mv] = await Promise.all([
        supabase.functions.invoke("bank-gateway", { body: { action: "get_balance", session_token: sessionToken, supplier_id: supplierId } }),
        supabase.functions.invoke("bank-gateway", { body: { action: "list_movements", session_token: sessionToken, supplier_id: supplierId } }),
      ]);
      if (bal.data?.error) throw new Error(bal.data.error);
      setBalance(bal.data?.balance || null);
      setMethod(bal.data?.method || null);
      setCanManageServer(bal.data?.canManage !== false);
      setProviders(bal.data?.providers || { monobank: "sandbox", liqpay: "sandbox" });
      setMovements(mv.data?.movements || []);
    } catch (e: any) {
      console.error(e);
      toast.error("Не вдалося завантажити баланс");
    } finally {
      setLoading(false);
    }
  }, [sessionToken, supplierId]);

  useEffect(() => { load(); }, [load]);

  const callAction = async (action: string, extra: Record<string, any> = {}, successMsg?: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("bank-gateway", {
        body: { action, session_token: sessionToken, supplier_id: supplierId, ...extra },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (successMsg) toast.success(successMsg);
      await load();
      return data;
    } catch (e: any) {
      toast.error(e.message || "Помилка операції");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const withdraw = () => callAction("request_withdrawal", {}, "Запит на вивід відправлено");
  const bindCard = async () => {
    if (cardNumber.replace(/\D/g, "").length < 12) { toast.error("Введіть коректний номер картки"); return; }
    const r = await callAction("bind_card", { card_number: cardNumber, holder: cardHolder, provider: "liqpay" }, "Картку прив'язано");
    if (r) { setCardOpen(false); setCardNumber(""); setCardHolder(""); }
  };
  const toggleAuto = (field: "auto_withdraw" | "auto_charge", value: boolean) =>
    callAction("set_payout_method", { [field]: value }, "Налаштування збережено");

  const available = Number(balance?.available || 0);
  const pending = Number(balance?.pending || 0);
  const lifetimePaid = Number(balance?.lifetime_paid || 0);
  const readOnly = readOnlyProp ?? !canManageServer;

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Balance header */}
      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Баланс магазину</p>
                <p className="text-2xl font-bold">{available.toLocaleString("uk-UA")} ₴</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={load} disabled={busy}>
              <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Banknote className="h-3.5 w-3.5" />
            Всього виплачено: <span className="font-semibold text-foreground">{lifetimePaid.toLocaleString("uk-UA")} ₴</span>
          </div>
          <Button className="w-full" onClick={withdraw} disabled={busy || available <= 0}>
            <ArrowDownToLine className="h-4 w-4" /> Вивести {available > 0 ? `${available.toLocaleString("uk-UA")} ₴` : ""}
          </Button>
        </CardContent>
      </Card>

      {/* Payout method */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Спосіб виплати</span>
            </div>
            {method?.masked_pan ? (
              <Badge variant="outline" className="font-mono">{method.masked_pan}</Badge>
            ) : (
              <Badge variant="secondary">Не прив'язано</Badge>
            )}
          </div>

          <Dialog open={cardOpen} onOpenChange={setCardOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <CreditCard className="h-4 w-4" /> {method?.masked_pan ? "Змінити картку" : "Прив'язати картку"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Прив'язка картки</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg p-3">
                  <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                  Зберігаємо лише токен і останні 4 цифри. Повний номер та CVV не зберігаються.
                </div>
                <div className="space-y-1.5">
                  <Label>Номер картки</Label>
                  <Input inputMode="numeric" placeholder="0000 0000 0000 0000" value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Власник картки</Label>
                  <Input placeholder="IVAN PETRENKO" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={bindCard} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Прив'язати
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Авто-вивід коштів</Label>
              <p className="text-xs text-muted-foreground">Щодня виводимо доступний баланс</p>
            </div>
            <Switch checked={!!method?.auto_withdraw} disabled={busy}
              onCheckedChange={(v) => toggleAuto("auto_withdraw", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Авто-списання націнки</Label>
              <p className="text-xs text-muted-foreground">Списувати нашу націнку з картки по наложених</p>
            </div>
            <Switch checked={!!method?.auto_charge} disabled={busy || !method?.masked_pan}
              onCheckedChange={(v) => toggleAuto("auto_charge", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Movements */}
      <Card>
        <CardContent className="p-5">
          <p className="font-semibold text-sm mb-3">Історія руху коштів</p>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Поки немає рухів</p>
          ) : (
            <ScrollArea className="h-72 pr-3">
              <div className="space-y-2">
                {movements.map((m) => {
                  const meta = TYPE_META[m.type] || { label: m.type, positive: m.amount >= 0 };
                  const positive = m.amount >= 0;
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                          positive ? "bg-green-500/10" : "bg-red-500/10")}>
                          {positive ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{meta.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleDateString("uk-UA")} · {m.provider}
                            {m.status === "failed" && " · помилка"}
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-sm font-bold shrink-0", positive ? "text-green-600" : "text-red-600")}>
                        {positive ? "+" : ""}{Number(m.amount).toLocaleString("uk-UA")} ₴
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
