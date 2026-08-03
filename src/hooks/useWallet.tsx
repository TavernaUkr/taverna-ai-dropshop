import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { isPreviewDevEnvironment } from "@/lib/dev-preview";

export interface WalletTransaction {
  id: string;
  type: "topup" | "payment" | "payout" | "bonus_earn" | "bonus_spend" | "refund" | "hold";
  amount: number;
  bonus_amount: number;
  provider: string;
  status: string;
  order_id: string | null;
  description: string | null;
  receipt: Record<string, unknown> | null;
  created_at: string;
}

export interface WalletLimit {
  provider: string;
  min_payout: number;
  max_payout: number;
  daily_limit: number;
  fee_percent: number;
  fee_fixed: number;
  is_active: boolean;
  eta_text: string | null;
}

export interface WalletState {
  id: string;
  balance: number;
  bonus_balance: number;
  pending: number;
  total: number;
  currency: string;
  is_connected: boolean;
  tg_wallet_address: string | null;
  tg_wallet_currency: string | null;
  payout_provider: string;
  auto_withdraw: boolean;
  auto_withdraw_min: number;
}

const demoWallet = (): WalletState => ({
  id: "preview-wallet",
  balance: 3420,
  bonus_balance: 1250,
  pending: 780,
  total: 4670,
  currency: "UAH",
  is_connected: false,
  tg_wallet_address: null,
  tg_wallet_currency: "USDT",
  payout_provider: "telegram_wallet",
  auto_withdraw: false,
  auto_withdraw_min: 500,
});

const demoTransactions = (): WalletTransaction[] => {
  const now = Date.now();
  const mk = (i: number, t: WalletTransaction["type"], amount: number, provider: string, description: string): WalletTransaction => ({
    id: `demo-${i}`,
    type: t,
    amount,
    bonus_amount: t === "payment" ? 90 : 0,
    provider,
    status: "completed",
    order_id: null,
    description,
    receipt: { amount, provider, at: new Date(now - i * 36e5).toISOString(), mode: "sandbox" },
    created_at: new Date(now - i * 36e5).toISOString(),
  });
  return [
    mk(1, "topup", 1500, "telegram_wallet", "Поповнення через Telegram Wallet"),
    mk(3, "payment", 1290, "internal", "Оплата замовлення TAV-000128"),
    mk(9, "bonus_earn", 0, "internal", "Бонуси за відгук"),
    mk(26, "payout", 800, "telegram_wallet", "Вивід на Telegram Wallet"),
    mk(48, "topup", 2000, "mono", "Поповнення Mono Pay"),
  ];
};

const demoLimits = (): WalletLimit[] => [
  { provider: "telegram_wallet", min_payout: 50, max_payout: 100000, daily_limit: 200000, fee_percent: 0, fee_fixed: 0, is_active: true, eta_text: "Миттєво" },
  { provider: "card", min_payout: 200, max_payout: 29999, daily_limit: 50000, fee_percent: 1, fee_fixed: 5, is_active: true, eta_text: "До 1 години" },
  { provider: "iban", min_payout: 500, max_payout: 400000, daily_limit: 400000, fee_percent: 0, fee_fixed: 0, is_active: true, eta_text: "1-2 банківські дні" },
];

interface UseWalletOptions {
  /** Рахунок магазину замість особистого */
  supplierId?: string;
}

export function useWallet({ supplierId }: UseWalletOptions = {}) {
  const { profile, isAuthenticated, sessionToken } = useTelegramAuthContext() as any;
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [limits, setLimits] = useState<WalletLimit[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [mode, setMode] = useState<"sandbox" | "live">("sandbox");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyDemo = useCallback(() => {
    setWallet(demoWallet());
    setTransactions(demoTransactions());
    setLimits(demoLimits());
    setMode("sandbox");
    setError(null);
  }, []);

  const call = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      if (!sessionToken) {
        if (isPreviewDevEnvironment()) {
          applyDemo();
          return { demo: true } as any;
        }
        throw new Error("Потрібна авторизація");
      }
      const { data, error: fnError } = await supabase.functions.invoke("wallet-account", {
        body: { action, session_token: sessionToken, supplier_id: supplierId, ...payload },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.wallet) {
        setWallet(data.wallet);
        setTransactions(data.transactions || []);
        setLimits(data.limits || []);
        setReadOnly(!!data.read_only);
        setMode(data.mode || "sandbox");
      }
      return data;
    },
    [sessionToken, supplierId, applyDemo],
  );

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await call("get_account");
    } catch (e: unknown) {
      if (isPreviewDevEnvironment()) applyDemo();
      else setError(e instanceof Error ? e.message : "Помилка рахунку");
    } finally {
      setIsLoading(false);
    }
  }, [call, applyDemo]);

  useEffect(() => {
    if (!isAuthenticated && !isPreviewDevEnvironment()) {
      setIsLoading(false);
      return;
    }
    refetch();
  }, [isAuthenticated, profile?.id, refetch]);

  const safe = async (fn: () => Promise<any>, demoPatch?: Partial<WalletState>) => {
    try {
      return await fn();
    } catch (e) {
      if (isPreviewDevEnvironment()) {
        setWallet((prev) => (prev ? { ...prev, ...demoPatch } : prev));
        return { demo: true };
      }
      throw e;
    }
  };

  return {
    wallet,
    transactions,
    limits,
    readOnly,
    mode,
    isLoading,
    error,
    refetch,
    connectWallet: (address?: string, currency: "TON" | "USDT" = "USDT") =>
      safe(() => call("connect_wallet", { address, currency }), { is_connected: true, tg_wallet_currency: currency }),
    topUp: (amount: number, provider: string) =>
      safe(() => call("create_topup", { amount, provider })),
    payWithBalance: (orderId: string, useBonus = true) =>
      call("pay_with_balance", { order_id: orderId, use_bonus: useBonus }),
    requestPayout: (amount: number, provider: string, destination?: string) =>
      safe(() => call("request_payout", { amount, provider, destination })),
    savePayoutSettings: (patch: Record<string, unknown>) =>
      safe(() => call("set_payout_settings", patch), patch as Partial<WalletState>),
  };
}
