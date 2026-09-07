import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Gift, ShoppingBag, RotateCcw, CreditCard, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BonusRulesSheet } from "@/components/wallet/BonusRulesSheet";
import { WalletOffers } from "@/components/wallet/WalletOffers";
import { WalletRatingCard } from "@/components/wallet/WalletRatingCard";
import { hapticSelection } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { WalletTransaction } from "@/hooks/useWallet";

const TX_ICON: Record<string, any> = {
  bonus_earn: Gift,
  bonus_spend: ShoppingBag,
  refund: RotateCcw,
};

const TX_TITLE: Record<string, string> = {
  bonus_earn: "Бонуси нараховано",
  bonus_spend: "Бонуси використано",
  refund: "Повернення",
};

interface ClientBonusAccountProps {
  bonusBalance: number;
  transactions: WalletTransaction[];
  onOpenReceipt: (tx: WalletTransaction) => void;
  onOpenRefund: () => void;
}

/**
 * Рахунок клієнта: ЛИШЕ бонуси.
 * Без гривневого балансу, без «в обробці», без поповнення та виводу.
 */
export function ClientBonusAccount({ bonusBalance, transactions, onOpenReceipt, onOpenRefund }: ClientBonusAccountProps) {

  const earned = transactions
    .filter((t) => t.type === "bonus_earn" || t.type === "refund")
    .reduce((s, t) => s + (t.bonus_amount || 0), 0);
  const spent = transactions
    .filter((t) => t.type === "bonus_spend")
    .reduce((s, t) => s + (t.bonus_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Бонусний баланс */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-rating/15 via-rating/5 to-transparent border border-border p-5"
      >
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Star className="h-3 w-3 text-rating fill-rating" /> Бонусний баланс
        </p>
        <div className="text-4xl font-bold text-foreground mt-1 flex items-center gap-2">
          {bonusBalance.toLocaleString("uk-UA")}
          <Star className="h-6 w-6 text-rating fill-rating" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Бонусами можна оплатити до 7% суми кошика
        </p>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-xl bg-card/70 border border-border p-2.5">
            <p className="text-[11px] text-muted-foreground">Зароблено</p>
            <p className="text-sm font-semibold text-success">+{earned.toLocaleString("uk-UA")}</p>
          </div>
          <div className="rounded-xl bg-card/70 border border-border p-2.5">
            <p className="text-[11px] text-muted-foreground">Витрачено</p>
            <p className="text-sm font-semibold text-foreground">−{spent.toLocaleString("uk-UA")}</p>
          </div>
        </div>
      </motion.div>

      {/* Рейтинг, ранг і множник бонусів */}
      <WalletRatingCard fallbackPoints={bonusBalance} />

      {/* Реквізити для повернення коштів */}
      <button
        onClick={() => { hapticSelection(); onOpenRefund(); }}
        className="w-full rounded-xl border border-border bg-card p-4 flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground text-sm">Картка для повернень</p>
          <p className="text-xs text-muted-foreground">
            Куди повернути кошти, якщо із замовленням щось не так
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Історія по замовленнях */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Історія та чеки по замовленнях</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Поки що немає нарахувань</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const Icon = TX_ICON[tx.type] || Gift;
              const isIncome = tx.type !== "bonus_spend";
              const value = tx.bonus_amount || 0;
              return (
                <button
                  key={tx.id}
                  onClick={() => { hapticSelection(); onOpenReceipt(tx); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card text-left"
                >
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center",
                    isIncome ? "bg-rating/15" : "bg-muted",
                  )}>
                    <Icon className={cn("h-4 w-4", isIncome ? "text-rating" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.description || TX_TITLE[tx.type]}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString("uk-UA")}
                    </p>
                  </div>
                  <p className={cn("text-sm font-semibold", isIncome ? "text-rating" : "text-foreground")}>
                    {isIncome ? "+" : "−"}{value.toLocaleString("uk-UA")}★
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <WalletOffers bonusBalance={bonusBalance} />

      {/* Правила бонусної програми */}
      <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-4">
        <AccordionItem value="rules" className="border-0">
          <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">
            <span className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              Як працюють бонуси та знижки?
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-xs text-muted-foreground space-y-2.5 pb-4">
            <p><span className="font-medium text-foreground">Нарахування.</span> Бонуси нараховуються після отримання замовлення, а також за відгук із фото.</p>
            <p><span className="font-medium text-foreground">Ліміт оплати.</span> Бонусами можна оплатити до 7% суми кошика — решта оплачується карткою або Telegram Wallet.</p>
            <p><span className="font-medium text-foreground">Множник рейтингу.</span> Чим вищий ваш ранг, тим більший множник нарахувань — від ×1 для «Новачка» до максимального для «Легенди».</p>
            <p><span className="font-medium text-foreground">Реферали.</span> За кожного друга, який зробить перше замовлення, ви отримуєте бонуси на рахунок після завершення його замовлення.</p>
            <p><span className="font-medium text-foreground">Повернення.</span> Використані бонуси повертаються на рахунок, якщо замовлення скасовано або оформлено повернення.</p>
            <p><span className="font-medium text-foreground">Термін дії.</span> Бонуси активні, доки ви робите хоча б одне замовлення на рік.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
