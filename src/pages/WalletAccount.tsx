import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Wallet, Plus, ArrowUpRight, Gift, Clock, Loader2,
  ArrowDownLeft, ShoppingBag, Settings2, Sparkles, Lock, Star, DollarSign, Store,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet, type WalletTransaction } from "@/hooks/useWallet";
import { ConnectWalletSheet } from "@/components/wallet/ConnectWalletSheet";
import { TopUpSheet } from "@/components/wallet/TopUpSheet";
import { PayoutSheet } from "@/components/wallet/PayoutSheet";
import { ReceiptDialog } from "@/components/wallet/ReceiptDialog";
import { ShopBalancesList } from "@/components/wallet/ShopBalancesList";
import { ClientBonusAccount } from "@/components/wallet/ClientBonusAccount";
import { RefundMethodPage } from "@/components/settings/RefundMethodPage";
import { WalletOffers } from "@/components/wallet/WalletOffers";
import { WalletOverview } from "@/components/wallet/WalletOverview";
import { WalletActionBar } from "@/components/wallet/WalletActionBar";
import { WalletRatingCard } from "@/components/wallet/WalletRatingCard";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { hapticSelection } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const TX_ICON: Record<string, any> = {
  topup: ArrowDownLeft,
  payment: ShoppingBag,
  payout: ArrowUpRight,
  bonus_earn: Gift,
  bonus_spend: Gift,
  refund: ArrowDownLeft,
  hold: Clock,
};

const TX_TITLE: Record<string, string> = {
  topup: "Поповнення",
  payment: "Оплата замовлення",
  payout: "Вивід коштів",
  bonus_earn: "Бонуси нараховано",
  bonus_spend: "Бонуси використано",
  refund: "Повернення",
  hold: "Заморожено",
};

export default function WalletAccount() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const [searchParams] = useSearchParams();
  const { effectiveRole } = useTelegramAuthContext() as any;
  const hasShops = ["supplier", "shop_manager", "admin", "moderator"].includes(effectiveRole);

  const {
    wallet, transactions, limits, shops, shopsTotals, readOnly, bonusOnly, mode, isLoading, error,
    connectWallet, topUp, requestPayout, savePayoutSettings,
  } = useWallet({ supplierId, withShops: hasShops && !supplierId });

  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<"overview" | "shops" | "personal">(
    !supplierId && hasShops
      ? tabParam === "shops" ? "shops" : tabParam === "personal" ? "personal" : "overview"
      : "personal",
  );
  const [showConnect, setShowConnect] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [receipt, setReceipt] = useState<WalletTransaction | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [autoMin, setAutoMin] = useState<string>("");
  const payRef = useRef<HTMLDivElement | null>(null);

  const action = searchParams.get("action");
  useEffect(() => {
    if (!action || isLoading) return;
    if (action === "topup" && !bonusOnly) setShowTopUp(true);
    if (action === "payout" && !readOnly && !bonusOnly) setShowPayout(true);
    if (action === "pay") {
      setTimeout(() => payRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [action, isLoading, readOnly, bonusOnly]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Wallet className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error || "Рахунок недоступний"}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Назад</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => { hapticSelection(); navigate(-1); }} className="p-1 -ml-1">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-foreground">
              {supplierId ? "Рахунок магазину" : "Мій рахунок"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {bonusOnly ? "Бонусний рахунок клієнта" : mode === "sandbox" ? "Тестовий режим" : "Telegram Wallet підключено"}
            </p>
          </div>
          {!readOnly && !bonusOnly && (
            <button onClick={() => setShowSettings((v) => !v)} className="p-2 rounded-lg hover:bg-muted">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Перемикач: особистий рахунок / магазини */}
        {!supplierId && hasShops && !bonusOnly && (
          <div className="px-4 pb-3">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted">
              {([
                { id: "overview", label: "Загалом", icon: TrendingUp },
                { id: "shops", label: "Магазини", icon: Store },
                { id: "personal", label: "Особистий", icon: Wallet },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { hapticSelection(); setTab(t.id); }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-colors",
                    tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {bonusOnly && !supplierId ? (
          <ClientBonusAccount
            bonusBalance={wallet.bonus_balance}
            transactions={transactions}
            onOpenReceipt={setReceipt}
            onOpenRefund={() => setShowRefund(true)}
          />
        ) : tab === "shops" && !supplierId ? (
          <ShopBalancesList
            shops={shops}
            totals={shopsTotals}
            onOpenShop={(id) => { hapticSelection(); navigate(`/wallet/${id}`); }}
          />
        ) : (
        <>
        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-border p-5"
        >
          <p className="text-xs text-muted-foreground">Загальний баланс</p>
          <div className="text-4xl font-bold text-foreground mt-1">
            {wallet.total.toLocaleString("uk-UA")}<span className="text-2xl">₴</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <Stat label="Доступно" value={wallet.balance} icon={DollarSign} />
            <Stat label="Бонуси" value={wallet.bonus_balance} accent icon={Star} />
            <Stat label="В обробці" value={wallet.pending} icon={Clock} />
          </div>

          {!readOnly && (
            <div className="flex gap-2 mt-4">
              <Button className="flex-1 h-11" onClick={() => setShowTopUp(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Поповнити
              </Button>
              <Button variant="outline" className="flex-1 h-11" onClick={() => setShowPayout(true)}>
                <ArrowUpRight className="h-4 w-4 mr-1.5" /> Вивести
              </Button>
            </div>
          )}

          {readOnly && (
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Режим перегляду: менеджер бачить надходження без доступу до коштів
            </div>
          )}
        </motion.div>


        {/* Connect banner */}
        {!wallet.is_connected && !readOnly && (
          <button
            onClick={() => setShowConnect(true)}
            className="w-full rounded-xl border border-primary/40 bg-primary/5 p-4 flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">Підключити Telegram Wallet</p>
              <p className="text-xs text-muted-foreground">Миттєві оплати та виводи в один тап</p>
            </div>
          </button>
        )}

        {/* Payout settings */}
        {showSettings && !readOnly && (
          <div className="rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Автовивід</p>
                <p className="text-xs text-muted-foreground">
                  Автоматично виводити кошти на {wallet.payout_provider === "telegram_wallet" ? "Telegram Wallet" : "картку"}
                </p>
              </div>
              <Switch
                checked={wallet.auto_withdraw}
                onCheckedChange={(v) => savePayoutSettings({ auto_withdraw: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Мінімальна сума автовиводу, ₴</Label>
              <div className="flex gap-2">
                <Input
                  value={autoMin || String(wallet.auto_withdraw_min)}
                  onChange={(e) => setAutoMin(e.target.value.replace(/[^\d]/g, ""))}
                  className="h-10"
                />
                <Button variant="outline" onClick={() => savePayoutSettings({ auto_withdraw_min: Number(autoMin || wallet.auto_withdraw_min) })}>
                  Зберегти
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Метод за замовчуванням</Label>
              <div className="grid grid-cols-3 gap-2">
                {["telegram_wallet", "card", "iban"].map((p) => (
                  <button
                    key={p}
                    onClick={() => savePayoutSettings({ payout_provider: p })}
                    className={cn(
                      "rounded-lg border p-2 text-xs",
                      wallet.payout_provider === p ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground",
                    )}
                  >
                    {p === "telegram_wallet" ? "Wallet" : p === "card" ? "Картка" : "IBAN"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Історія та чеки</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Рухів поки немає</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const Icon = TX_ICON[tx.type] || Wallet;
                const isIncome = ["topup", "refund", "bonus_earn"].includes(tx.type);
                return (
                  <button
                    key={tx.id}
                    onClick={() => { hapticSelection(); setReceipt(tx); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card text-left"
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      isIncome ? "bg-success/15" : "bg-muted",
                    )}>
                      <Icon className={cn("h-4 w-4", isIncome ? "text-success" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {tx.description || TX_TITLE[tx.type]}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString("uk-UA")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-semibold", isIncome ? "text-success" : "text-foreground")}>
                        {isIncome ? "+" : "−"}{tx.amount.toLocaleString("uk-UA")}₴
                      </p>
                      {tx.bonus_amount > 0 && (
                        <p className="text-[11px] text-primary">−{tx.bonus_amount} бонусів</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!supplierId && <div ref={payRef}><WalletOffers bonusBalance={wallet.bonus_balance} /></div>}
        </>
        )}
      </div>

      {showRefund && <RefundMethodPage onBack={() => setShowRefund(false)} />}

      <ConnectWalletSheet open={showConnect} onOpenChange={setShowConnect} onConnect={connectWallet} />
      <TopUpSheet open={showTopUp} onOpenChange={setShowTopUp} limits={limits} mode={mode} onTopUp={topUp} />
      <PayoutSheet open={showPayout} onOpenChange={setShowPayout} wallet={wallet} limits={limits} onPayout={requestPayout} />
      <ReceiptDialog transaction={receipt} onOpenChange={() => setReceipt(null)} />
    </div>
  );
}

function Stat({ label, value, accent, icon: Icon }: { label: string; value: number; accent?: boolean; icon?: any }) {
  return (
    <div className="rounded-xl bg-card/70 border border-border p-2.5">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className={cn("h-3 w-3", accent ? "text-rating" : "text-muted-foreground")} />}
        {label}
      </p>
      <p className={cn("text-sm font-semibold", accent ? "text-primary" : "text-foreground")}>
        {Number(value).toLocaleString("uk-UA")}₴
      </p>
    </div>
  );
}

