# Банк-інтеграція + Баланс магазинів + Тестування під тест-ролями

Реалізуємо гібридну фінансову модель: **баланс магазину** як єдиний реєстр руху коштів, з авто-виводами та ручним виводом, прив'язкою карти й авто-списанням нашої націнки. Інтегруємо **Monobank** і **LiqPay** (прийом + виплати), із sandbox-режимом доти, доки не додані реальні ключі. Згенеруємо тестові замовлення/виплати для перевірки під тест-ролями.

## Фінансова модель (підтверджено)

```text
БАЛАНС МАГАЗИНУ = Σ нарахувань постачальнику (дроп) − Σ нашої націнки (по COD)
                  − штрафи/повернення

SPLIT(created) → доставка НП + вікно повернення → eligible
  → нарахування "+дроп" на баланс (рух: payout_accrual)
  → COD-замовлення: "−націнка" на баланс (рух: markup_debit) + спроба авто-списання з картки
  → АВТО-ВИВІД (cron, раз/добу) усього eligible-балансу на IBAN/карту
  → або РУЧНИЙ "Вивести" постачальником (≥ мін. суми)
```

Двосторонній рух (ми платимо за дроп, постачальник винен нам націнку по наложених) живе в одному балансі — взаємозалік автоматичний; залишок виводиться.

## Частина 1 — База даних (міграція)

**`shop_balances`** (по постачальнику): `supplier_id` (unique), `available` numeric, `pending` numeric, `lifetime_paid` numeric, `currency` default `UAH`.

**`balance_movements`** (реєстр, append-only): `supplier_id`, `order_split_id` (nullable), `type` (`payout_accrual | markup_debit | withdrawal | refund_adjust | penalty | card_charge`), `amount` (±), `balance_after`, `status` (`pending | settled | failed`), `provider` (`monobank | liqpay | manual | internal`), `external_tx_id`, `description`.

**`payout_methods`** (прив'язані карти/реквізити): `supplier_id`, `provider`, `type` (`card | iban`), `masked_pan`, `card_token` (токен від LiqPay/Mono, не PAN!), `iban`, `holder`, `is_default`, `auto_withdraw` bool, `auto_charge` bool (дозвіл на авто-списання націнки), `min_withdraw` numeric.

GRANT: `service_role` повний; `authenticated` лише SELECT через safe-патерн (доступ до фінансів — лише через edge-функції, як у memory). Card-токени/PAN ніколи не читаються клієнтом напряму.

Розширення наявних: на `order_splits` вже є `payout_stage/eligible_payout_at` — додаємо `balance_movement_id` (зв'язок з реєстром).

## Частина 2 — Edge Functions

**`bank-gateway`** (нова, сервісна) — абстракція над банками, дії:
- `bind_card` — створює токен карти (LiqPay tokenization / Mono), зберігає `payout_methods` (тільки токен+маска).
- `payout` — вихідний переказ постачальнику (Monobank business / LiqPay payout) на IBAN/карту; повертає `external_tx_id`, пише `balance_movements(type=withdrawal)`.
- `charge_card` — авто-списання нашої націнки з прив'язаної карти по COD (LiqPay recurring/Mono); пише `card_charge`.
- Усі гілки мають `SANDBOX` режим (генерує fake tx_id), якщо немає ключів — щоб тест-ролі працювали зараз.

**`manage-payments` (розширення):** + дії `get_balance`, `list_movements`, `request_withdrawal` (ручний вивід постачальником), `run_auto_withdrawals` (cron), `set_payout_method`.

**`process-payout` (розширення):** замість миттєвого переказу — `run_auto_payouts` тепер **нараховує на баланс** (`payout_accrual`) і ставить `paid`; реальний переказ робить `run_auto_withdrawals` через `bank-gateway`.

**`seed-test-payments`** (нова, лише admin/тест) — генерує тестові замовлення + splits + рухи балансу для 4 існуючих магазинів, щоб перевірити весь цикл під тест-ролями.

**Cron (insert-tool, pg_cron+pg_net):** `run_auto_withdrawals` раз/добу; існуючі `track-deliveries`/`run_auto_payouts` лишаються.

## Частина 3 — Інтерфейс

**Постачальник — вкладка «Баланс» (`StoreManagement.tsx` / `SupplierOrders.tsx`):**
- Картка балансу (доступно / в очікуванні / всього виплачено).
- Кнопка «Вивести» (ручний вивід) + тумблер «Авто-вивід».
- «Прив'язати карту» (форма токенізації) + тумблер «Авто-списання націнки».
- Стрічка рухів (`balance_movements`) зі статусами й tx_id.

**Адмін — `PaymentsManager.tsx` (розширення):**
- Перемикач провайдера (Monobank / LiqPay), статус ключів (sandbox/live).
- По кожному магазину: баланс, історія рухів, ручний «Виплатити зараз» / «Списати націнку».
- Кнопка «Згенерувати тестові дані» (виклик `seed-test-payments`).

**Модератор:** перегляд балансів і рухів по магазинах (read-only, як у наявній панелі).

## Частина 4 — Секрети та провайдери

Реальні перекази потребують ключів. Запросимо в білд-режимі:
- `MONOBANK_TOKEN` (екваєринг/business для ФОП).
- `LIQPAY_PUBLIC_KEY`, `LIQPAY_PRIVATE_KEY` (payout + tokenization).
Доки їх немає — усе працює в SANDBOX (fake tx), щоб одразу тестувати логіку.

## Частина 5 — Тестування під тест-ролями

1. Згенерувати тестові реквізити для 4 магазинів + тестові замовлення/splits (`seed-test-payments`).
2. Через перемикач «жук» зайти як Постачальник → перевірити баланс, прив'язку карти, ручний/авто-вивід.
3. Як Адмін → перевірити виплати, списання націнки, генерацію даних.
4. Як Модератор → перевірити read-only перегляд.
5. Прогнати edge-функції через curl + переглянути логи; перевірити рухи в `balance_movements`.

## Технічні деталі

- Картки зберігаємо лише як токени провайдера + маска — без PAN/CVV (PCI-safe).
- Доступ до фінансів — лише через edge-функції (memory: PII/фінанси не читаються з клієнта напряму).
- Sandbox-перемикач у `bank-gateway` дозволяє повний тест без реальних грошей.
- Авто-списання націнки спрацьовує лише за згодою постачальника (`auto_charge=true`).

## Порядок робіт

1. Міграція БД (баланси, рухи, методи виплат) + GRANT/RLS.
2. `bank-gateway` (sandbox+live) + розширення `manage-payments`/`process-payout`.
3. `seed-test-payments` + генерація тест-даних.
4. UI: баланс постачальника, розширення адмін-панелі, перегляд модератора.
5. Cron авто-виводів.
6. Запит секретів Monobank/LiqPay + переключення на live.
7. Повне тестування під тест-ролями.