

## План: 3 зміни у вкладці Рейтинг

### 1. Кнопка "Бонуси" → "Рейтингові бонуси"
Замість переходу на `/bonus-account`, кнопка `navigate("/bonus-account")` стане `navigate("/bonus-account?section=rating")` або просто з `showRatingBonuses=true` state. Текст змінити на "Рейтингові бонуси", іконку залишити `Wallet` або замінити на `Trophy`.

### 2. Анімація свечіння для 1-го місця
В `supplier-badge.tsx`:
- Якщо `badge.place === 1` — додати CSS-анімацію glow/pulse до галочки (`BadgeCheck`) та heartbeat до кубка (`Trophy`).
- Використати `animate-pulse` для кубка + кастомну CSS-анімацію `glow` з `box-shadow` відповідного кольору для галочки.
- Додати CSS keyframes в `src/index.css` для `@keyframes badge-glow` (свечіння) та `@keyframes heartbeat` (збільшення/зменшення кубка).
- У `RatingsTab.tsx` — для рядків рейтингу де `rank === 1`, також застосувати glow-ефект на галочку та пульсацію кубка у відповідному кольорі періоду.
- Кольори свечіння визначатимуться за tier: gold=yellow, silver=slate, bronze=amber, daily=blue.

### 3. Фільтр по категоріям та місцях
В `RatingsTab.tsx` додати над списком рейтингу (під `PeriodSelector`):
- **Фільтр по категоріях** — Select з категоріями товарів (з `useProducts().categories`). Фільтрує магазини/клієнтів за категорією товарів.
- **Фільтр по місцях** — Select з опціями: "Всі", "Топ 3", "Топ 10", "4-10 місце". Фільтрує список за позицією.
- Обидва фільтри відображатимуться в компактному рядку під PeriodSelector.

### Файли що змінюються
- `src/components/RatingsTab.tsx` — кнопка "Рейтингові бонуси", фільтри категорій та місць
- `src/components/ui/supplier-badge.tsx` — glow + heartbeat анімації для 1-го місця
- `src/index.css` — CSS keyframes для `badge-glow` та `heartbeat`

