# План: Безпека персональних даних + виправлення RLS

## Принципи

1. **Персональні дані (ПД) — лише адмін.** Усі чутливі поля (email, phone, IBAN, tax_code, payment_*, telegram_id, повне ім'я, адреси доставки) ізольовані. Прямий доступ з клієнта (anon key) — заборонено для всіх, окрім адміна.
2. **Адмін = повний доступ.** Реальна роль `admin` (через `has_role`) → всі CRUD у всіх таблицях.
3. **Тест-ролі (Dev Role Switcher) ⊂ реальні ролі.** Тест-ролі — це лише UI-симуляція в межах прав адміна. Жодних виключень у RLS для "тестового" режиму. Тест ніколи не отримує більше прав, ніж реальна роль того самого користувача (тобто адміна, який тестує). Test → Real, ніколи Real ← Test.
4. **Інші користувачі (гість/клієнт/постачальник/менеджер/модератор)** працюють лише через **Edge Functions** з валідацією Telegram-сесії на сервері.

## Архітектура доступу

```text
                      ┌─────────────────────┐
  anon key (client) ──┤  RLS: USING(false)  │── для всіх PII-таблиць
                      └──────────┬──────────┘
                                 │
                      ┌──────────▼──────────────┐
                      │  Edge Function          │
                      │  (validates session +   │
                      │   role server-side)     │
                      └──────────┬──────────────┘
                                 │ service_role
                      ┌──────────▼──────────┐
                      │  Tables (full data) │
                      └─────────────────────┘

  Окремий випадок: admin (real role)
  → SELECT/UPDATE/DELETE дозволено напряму через has_role(auth.uid(),'admin')
    АЛЕ оскільки auth.uid()=NULL у Telegram-сесії, адмін теж ходить через
    edge function `admin-data-access`, яка перевіряє admin-сесію.
```

## Зміни в БД (міграція)

### A. Жорсткі RLS для PII-таблиць
Замінити всі `USING(true)` на `USING(false)` для:
- `profiles`, `suppliers`, `delivery_addresses`, `cart_items`, `sessions`,
  `user_roles`, `shop_manager_links`, `user_bans`, `supplier_payouts`,
  `supplier_payment_deadlines`, `supplier_applications`

Service role bypass-ить RLS автоматично — політики `USING(true)` не потрібні.

### B. Безпечні публічні в'ю (без ПД) — для каталогу
```sql
CREATE VIEW public.suppliers_public WITH (security_invoker=on) AS
  SELECT id, shop_name, logo_url, cover_image_url, description,
         shop_photos, return_policy, exchange_policy, shipping_schedule,
         shipping_days, website_url, telegram_channel_url, is_active,
         markup_percentage, created_at
  FROM public.suppliers
  WHERE is_active = true;
-- БЕЗ: contact_email, contact_phone, tax_code, payment_*, telegram_id,
--      contact_name, manager_telegram, company_name
```

Аналогічно `profiles_public` (тільки first_name + avatar для відображення в відгуках).

### C. Виправлення `user_roles` (CRITICAL)
```sql
DROP POLICY "Service role can manage roles" ON public.user_roles;
DROP POLICY "Users can view own roles" ON public.user_roles;
-- залишається тільки доступ через service_role (edge function)
```

## Нові Edge Functions

| Функція | Призначення | Перевірка |
|---|---|---|
| `manage-user-roles` | додати/видалити роль (для AdminRolesManager) | `validateSession` → `has_role(admin)` |
| `manage-cart` | add/update/delete cart_items | session.profile_id = item.profile_id |
| `manage-supplier` | оновлення власного магазину | session власник або admin |
| `manage-profile` | оновлення власного профілю | session.profile_id = id |
| `manage-shop-links` | прив'язка менеджерів | admin only |
| `admin-data-access` | універсальний read для адмін-панелей (PII) | `has_role(admin)` |

Усі функції:
- читають `session_token` із body → `validateSession()` (як у telegram-auth)
- перевіряють роль через `has_role` RPC
- логують спробу доступу до ПД

## Refactor клієнтського коду

Замінити прямі `supabase.from(...)` на `supabase.functions.invoke(...)` у:
- `src/hooks/useCart.tsx` → `manage-cart`
- `src/services/api.ts` (cart_items блок)
- `src/components/admin/AdminRolesManager.tsx` → `manage-user-roles`
- `src/components/admin/AdminStoreManager.tsx`, `ManualSupplierForm.tsx` → `manage-shop-links` + `manage-supplier`
- `src/components/supplier/SupplierSettings.tsx` → `manage-supplier`
- `src/pages/Suppliers.tsx`, `SupplierProfile.tsx`, `RatingsTab.tsx` → читання з `suppliers_public`
- `src/pages/MyShops.tsx`, `Manager.tsx`, `StoreManagement.tsx` → admin/owner потоки через edge functions

## Тест-ролі (Dev Role Switcher)
Файл `src/components/profile/DevRoleSwitcher.tsx`:
- Зберігає лише **локально** (sessionStorage) обрану "тест-роль".
- На сервері НІЯКИХ привілеїв не дає — просто змінює UI.
- Доступний лише користувачам, які реально мають роль `admin` (перевірка на сервері при відкритті панелі).
- Якщо адмін симулює "клієнта" — UI показує клієнтські обмеження, але серверні запити йдуть під справжньою admin-сесією → жодних додаткових прав.

## Послідовність виконання

1. **Міграція БД** — нові політики, в'ю, dropping старих.
2. **6 нових edge functions** — повна реалізація з валідацією.
3. **Рефактор client коду** — поступово, файл за файлом.
4. **Перевірка Dev Role Switcher** — серверна перевірка `admin`.
5. **Оновлення security memory** — нова модель доступу.

## Технічні деталі

- Усі edge functions використовують спільну `validateSession()` із `telegram-auth/index.ts` (винесемо у shared util? Ні — Supabase edge не підтримує імпорти між функціями. Дублюємо інлайн або копіюємо у кожну функцію.)
- `has_role()` викликається через `supabase.rpc('has_role', {_user_id, _role})` всередині кожної edge function.
- В'ю `_public` створюються з `security_invoker=on`, щоб RLS базової таблиці поширювалось на читачів в'ю; але оскільки базова таблиця має `USING(false)` для anon, в'ю буде працювати лише через service_role (читання у функції) АБО через окрему позитивну SELECT-політику на конкретні безпечні поля.

  Альтернатива: зробити в'ю з `security_invoker=off` (за замовчуванням `security_definer`), тоді в'ю обходить RLS базової таблиці. Це безпечно, бо в'ю **не містить чутливих стовпців**. Використаємо цей варіант для каталогу.

- Розмір змін: ~1 міграція (~200 рядків SQL), 6 нових edge functions (~150 рядків кожна), ~12 файлів клієнтського коду.

## Що НЕ входить у цей етап
- Покращення сесій (HMAC, refresh tokens, TTL) — окремий план.
- Rate limiting на `reports` — окремий план.
- Аудит логів доступу до ПД — окремий план (можна додати таблицю `pii_access_log`).
