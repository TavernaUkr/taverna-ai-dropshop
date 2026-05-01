## План (Частина 2): Завершення панелі "Просування" — реальна авто-черга, діалог налаштувань та серверна персистентність

### Що вже реалізовано (Частина 1, затверджена раніше)

- Мульти-селектор магазинів з чіпсами та чекбоксами
- Розділення для адміна: "Мої магазини" / "Партнерські магазини"
- Передача `supplierIds: string[]` у `PostingTab` та `AdvertisingTab` з фільтрацією `.in("supplier_id", ...)`
- UI-каркас вкладки "Авто-черга" з кнопками створення, паузою, видаленням
- Збереження авто-черг у `localStorage`

### Що ще НЕ реалізовано (поточна задача)

#### 1. Діалог створення авто-черги (зараз: створюється з дефолтами)

Замінити прямий `addAutoQueue()` на повноцінний модальний діалог `AutoQueueDialog.tsx` з полями:

- **Назва черги** (для зручності розпізнавання)
- **Тип**: Постинг / Реклама (radio)
- **Магазини**: успадковуються з мульти-селектора, але можна зняти/додати в межах діалогу
- **Режим вибору товарів**:
  - `random` — рандомний товар з обраних магазинів (як зараз працює `auto-post`)
  - `manual` — вибір конкретних товарів зі списку (з пошуком + drag-and-drop порядок)
- **Інтервал постинга**: пресети (5хв / 15хв / 1год / 3год / 6год / 12год / 24год) + custom
- **Платформи**: чекбокси (Telegram, Instagram, TikTok, Viber, OLX і т.д. — з `platforms` з PostingTab)
- **Бюджет** (для типу "advertising"): денний ліміт у грн
- **Час активності**: "Цілодобово" або "Робочі години 09:00–21:00"
- **Дата старту/закінчення** (опціонально)

#### 2. Серверна персистентність авто-черг

Створити нову таблицю `user_auto_queues`:

```text
- id uuid pk
- profile_id uuid (власник черги)
- supplier_ids uuid[] (магазини)
- product_ids uuid[] (для manual mode, порядок зберігається)
- name text
- type text ('posting' | 'advertising')
- mode text ('random' | 'manual')
- interval_minutes int
- platforms text[]
- budget numeric (для реклами)
- active_hours_start int (0-23, null = 24/7)
- active_hours_end int
- start_date / end_date timestamptz
- is_paused boolean
- last_executed_at timestamptz
- next_execution_at timestamptz
- total_published int
- created_at / updated_at
```

RLS: користувач бачить/редагує свої черги; service_role повний доступ; admin/moderator бачить усі.

Мігрувати існуючі `localStorage` черги при першому завантаженні (one-shot перенос).

#### 3. Серверне виконання авто-черг через `auto-post` edge function

Розширити `supabase/functions/auto-post/index.ts`:

- Окрім існуючої логіки round-robin по `auto_promotion_queue` (платформенний рівень), додати **другий цикл**: проходити по `user_auto_queues` де `is_paused = false` AND `next_execution_at <= now()` AND активні години відповідають поточному UTC.
- Для `mode = "random"`: випадковий товар з `supplier_ids` (без повторів останніх 24 год)
- Для `mode = "manual"`: наступний товар з `product_ids` (round-robin по позиції)
- Публікація на всі обрані `platforms` (Telegram через існуючу логіку, інші платформи — створення запису в `promotions` зі статусом `scheduled` для майбутньої інтеграції)
- Оновити `last_executed_at`, `next_execution_at = now() + interval_minutes`, `total_published++`
- Логування у `import_logs` або окремій таблиці `auto_queue_executions` для аудиту

#### 4. Drag-and-drop для manual режиму

Додати `@dnd-kit/sortable` (вже може бути встановлений — перевірити `package.json`). Список обраних товарів у діалозі з можливістю перетягування для зміни порядку публікації.

#### 5. Назва магазину біля товару при мульти-вибірці

У `PostingTab.tsx` та `AdvertisingTab.tsx` коли `supplierIds.length > 1`:

- Завантажувати `shop_name` для знайдених товарів через окремий запит (або join)
- Відображати маленький бейдж з назвою магазину під назвою товару у списку результатів пошуку

#### 6. Картка авто-черги — розширений вигляд

У `Manager.tsx` (вкладка "Авто-черга") показувати для кожної черги:

- Назву та режим (як зараз)
- **Прогрес**: `total_published` публікацій · наступна через X хв
- **Список магазинів** (chip-style, до 3, далі "+N")
- **Платформи** (іконки)
- Кнопку "Редагувати" → відкриває той самий `AutoQueueDialog` з заповненими полями
- Кнопки Пауза/Старт та Видалити (вже є)

#### 7. Валідації при створенні

- Не давати створити чергу без обраних магазинів → toast попередження
- Для `manual` — мінімум 1 товар
- Для `advertising` — мінімум бюджет 50 грн/день

### Зміни по файлах

```text
src/pages/Manager.tsx
  — замінити addAutoQueue() на відкриття діалогу
  — підвантажувати auto-queues з БД (а не з localStorage)
  — one-shot міграція localStorage → БД
  — оновити картки авто-черг (прогрес, магазини, платформи, edit)

src/components/manager/AutoQueueDialog.tsx (НОВИЙ)
  — повний форм-діалог з усіма полями
  — drag-and-drop для manual режиму
  — пресети інтервалів + custom

src/components/manager/PostingTab.tsx
src/components/manager/AdvertisingTab.tsx
  — бейдж з назвою магазину біля товарів при мульти-вибірці
  — підвантаження shop_name батчем

supabase/migrations/<new>_user_auto_queues.sql (НОВИЙ)
  — таблиця user_auto_queues + RLS

supabase/functions/auto-post/index.ts
  — додати обробку user_auto_queues (другий цикл)
  — логіка manual queue (round-robin по позиції)
  — врахування active_hours, start_date/end_date
```

### pg_cron

Існуючий cron job `auto-post` (кожні 5 хв) — нічого не змінювати, він просто почне додатково обробляти `user_auto_queues`.

### Етапність

1. Створити таблицю `user_auto_queues` з RLS
2. Створити `AutoQueueDialog.tsx`
3. Інтегрувати діалог у `Manager.tsx` + завантаження/збереження в БД
4. One-shot міграція з `localStorage`
5. Розширити `auto-post` edge function
6. Додати бейджі магазинів у Posting/Advertising табах

### Технічні деталі

- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable` (стандарт для shadcn проєктів)
- Інтервали зберігаються як `interval_minutes` (int), мінімум 5 хв (захист від спаму)
- `next_execution_at` обчислюється на сервері при кожному виконанні
- Фільтр активних годин: `EXTRACT(HOUR FROM now() AT TIME ZONE 'Europe/Kiev')` між start/end
- При паузі `next_execution_at` не зсувається; при знятті з паузи — перераховується від `now()`
