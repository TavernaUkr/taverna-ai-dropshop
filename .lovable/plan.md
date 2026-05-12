
## Контекст: що вже зроблено і що випало

За останні три ітерації ми:
- Зробили мульти-вибір магазинів і товарів у "Просуванні" (`ProductMultiSelector`, `Manager.tsx`, `PostingTab`, `AdvertisingTab`).
- Зробили серверні авто-черги (`user_auto_queues` + `auto-post` обробка з рандом/мануал, активні години, AI-генерація).
- Закрили критичну privilege-escalation діру в `user_roles`, винесли керування ролями в edge function.

Залишилось три блоки незавершеного, які впливають на користувача прямо зараз:

### Блок A — "Просування" не доводить роботу до кінця
1. **Батч-публікації не публікуються.** Коли користувач обирає 2+ товарів або "усі товари", `PostingTab`/`AdvertisingTab` робить `INSERT` у `promotions` зі `status='pending'`, але `auto-post` НЕ читає такі рядки. Тобто користувач "оплатив постинг" → нічого не відбулось.
2. **Немає превʼю кампанії.** Натиснув "Опублікувати 12 товарів" — і відразу списались гроші. Треба модалку: список товарів, шаблон тексту, орієнтовна вартість, час, кнопки "Підтвердити / Скасувати".
3. **UX вибору магазинів грубий.** Якщо магазин один — все одно треба клікнути. Немає чіткої "сводки" зверху ("Обрано: 2 магазини · 12 товарів · ~24 хв на публікацію").
4. **Валідація відсутня.** Можна натиснути "Опублікувати" без обраних платформ / без тексту / без товарів — впаде з нечитабельною помилкою.
5. **Немає списку моїх "в черзі" та можливості скасувати.** Користувач не бачить, що з його батчу опубліковано, що чекає, не може зупинити.
6. **Мобільний layout (Telegram Mini App).** Чіпси/чекбокси/таби потрібно перевірити на 360px ширині.

### Блок B — Фаза 2 безпеки (з минулого разу)
- `cart_items`, `delivery_addresses`, `shop_manager_links`, `user_bans` — все ще `USING(true)`.
- `ManualSupplierForm.tsx`, `AdminStoreManager.tsx` — досі пишуть напряму у `user_roles` (мовчки впадуть).
- Каталог/відгуки читають `suppliers`/`profiles` напряму замість `_public` view.

### Блок C — Дрібниці що згадувались
- Ratings бейджі при перегляді магазину (вже є для постингу).
- Дев-роль перемикач показує "як виглядає клієнтом" — переконатися, що сервер усе одно не пускає тестову роль вище реальних прав адміна.

---

## План реалізації

Виконуємо у три фази в одному ході. Ціль — щоб користувач бачив одразу зрозумілу, безпечну й завершену кнопку "Просування".

### Фаза 1 — Батч-публікації справді працюють

**Edge function `auto-post`** (розширення):
- Перед обробкою `user_auto_queues` додати **`processPendingPromotions()`**: брати до 10 рядків `promotions` зі `status='pending'`, для кожного:
  - підтягнути товар, побудувати текст (якщо `ai_generated_text` є шаблон з `{name}`/`{price}` — підставити, інакше згенерувати через Gemini),
  - публікувати в Telegram (як уже робиться),
  - оновлювати `status='active'`, `telegram_message_id`, `start_date=now`.
- Між публікаціями робити невелику затримку (1-2с), щоб не впертися в Telegram rate-limit.

**Клієнт (`PostingTab`/`AdvertisingTab`)**:
- При батч-вставці писати всі поля коректно (`promotion_type`, `platforms`, `ai_generated_text` як шаблон, `supplier_id`, `product_id`).
- Після успішного `INSERT` показати тост "Додано N в чергу — перші публікації за 1-5 хв".

### Фаза 2 — UX "Просування"

**Зведення зверху** (`Manager.tsx` хедер табу):
- Картка-стікі: "Магазинів: X · Товарів: Y · Платформ: Z · Орієнтовно: ~N хв".
- Якщо у користувача рівно один магазин — авто-вибрати його.

**Превʼю-модалка перед оплатою/публікацією** (`PromotionPreviewDialog.tsx`, новий):
- Список товарів (перші 5 з лічильником "ще +N"),
- Згенерований AI-текст / шаблон (з можливістю редагувати перед запуском),
- Платформи, інтервал, орієнтовна вартість і час,
- Кнопки "Запустити" / "Скасувати".
- Викликається з обох табів замість прямого `handleSubmit`.

**Валідація** (хелпер `validatePromotion()` у `Manager.tsx`):
- Магазин(и) ✓, товар(и) або режим "усі" ✓, платформи ✓, бюджет>0 для реклами ✓.
- Кнопка дізейблиться + tooltip із причиною.

**"Мої кампанії" таб** (новий `MyCampaignsTab.tsx`):
- Список рядків `promotions` поточного користувача (через нову edge function `list-my-promotions` що бере supplier_ids з shop_manager_links + own).
- Статус (pending/active/done), час, кнопка "Скасувати pending".
- Інтегрується третім табом у `Manager.tsx` поруч з "Постинг" і "Реклама".

**Мобільний layout**:
- `ProductMultiSelector` — `max-h-56` зменшити до `max-h-[40vh]` на мобілці, чіпси `text-[11px]`.
- Стікі-зведення фіксується зверху таба.

### Фаза 3 — Безпека (добиваємо)

**Edge function `manage-cart`** — actions `list/add/update/remove`, валідація сесії, `profile_id` із сесії.

**Edge function `manage-supplier`** — actions `get_my_suppliers/update_settings`, перевірка через `shop_manager_links` або власник.

**Edge function `manage-shop-links`** — admin-only `add/remove/list`. Перевести `ManualSupplierForm` і `AdminStoreManager` на `manage-user-roles` + `manage-shop-links`.

**Міграція БД**:
- `cart_items`, `delivery_addresses`, `shop_manager_links`, `user_bans` — `DROP POLICY ... USING(true)`, лишити тільки service-role-bypass (без політики).
- (`profiles`, `suppliers`, `user_roles` уже зачищені у Фазі 1).

**Клієнт переключити на `_public` view**: `Suppliers.tsx`, `SupplierProfile.tsx`, `RatingsTab.tsx`, `ProductDetail.tsx` (де читається продавець без PII).

**Дев-перемикач**: переконатись, що на сервері `manage-*` функції не довіряють жодному "тестова роль" — лише реальній ролі з БД.

---

## Технічні деталі (для довідки)

```text
auto-post (cron 5 хв)
  ├─ processPendingPromotions()   ← НОВЕ: батчі від користувача
  ├─ processUserAutoQueues()      ← вже є
  └─ processQueueRotation()       ← вже є (round-robin постачальників)
```

Нові файли:
- `src/components/manager/PromotionPreviewDialog.tsx`
- `src/components/manager/MyCampaignsTab.tsx`
- `supabase/functions/manage-cart/index.ts`
- `supabase/functions/manage-supplier/index.ts`
- `supabase/functions/manage-shop-links/index.ts`
- `supabase/functions/list-my-promotions/index.ts`
- 1 SQL міграція (DROP USING(true) на 4 таблицях)

Редаговані:
- `supabase/functions/auto-post/index.ts` (+ `processPendingPromotions`)
- `src/pages/Manager.tsx` (стікі-зведення, авто-вибір 1-магазину, 3-й таб, валідація)
- `src/components/manager/PostingTab.tsx`, `AdvertisingTab.tsx` (виклик превʼю замість прямого submit)
- `src/components/manager/ProductMultiSelector.tsx` (мобільні розміри)
- `src/components/admin/ManualSupplierForm.tsx`, `AdminStoreManager.tsx`, `src/hooks/useCart.tsx`, `src/services/api.ts`, `Suppliers.tsx`, `SupplierProfile.tsx`, `RatingsTab.tsx`, `ProductDetail.tsx`
- `supabase/config.toml` (4 нові функції з `verify_jwt = false`)

## Що НЕ входить
- Платіжний провайдер (поки що мок як зараз).
- HMAC сесій / refresh tokens — окремий план безпеки сесій.
- Аналітика конверсії кампаній (CTR, ROI) — окремий план.
