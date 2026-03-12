

## Plan: Cumulative Rating Score + Day Period with Blue Badge

### What changes

**1. Add "Day" period with Blue Badge (Синя галочка)**
- New tier `"daily"` between Bronze and Verified (Green)
- Color: blue (`text-blue-500`, `bg-blue-500/15`)
- Top 1-3 daily = Blue checkmark + trophy with place
- Update `getSupplierBadge` / `getCustomerBadge` to accept `dailyRank` parameter
- Tier priority: Gold > Silver > Bronze > Blue > Green

**2. Update Green badge to include Day**
- Green (verified) = Top 4-10 in ANY period (day, week, month, year)

**3. Add "Загальний рейтинг" formula explanation in BadgeRules**
A cumulative numeric score that only goes up or down:
- **Positive factors**: orders count, products count, total spent/revenue, positive reviews, bonuses used/earned
- **Negative factors**: confirmed complaints (-points), returns (shop's fault for sellers, client abuse for buyers), penalties from moderator

This score determines position in rankings. The "Рейтинг" number shown next to each participant IS this cumulative score.

**4. Add Day to PeriodSelector and data generators**
- `Period` type becomes `"day" | "week" | "month" | "year"`
- Add day multiplier and bonuses/perks for day period
- Customer daily bonuses: smaller amounts (+20₴, +10₴, +5₴)
- Supplier daily perks: minor boosts

**5. Update BadgeRules with full rating calculation breakdown**
- Section explaining how the score accumulates
- Section for each badge tier (now 5 tiers including Blue)
- Updated penalty section referencing score deductions

### Files to change

- `src/components/ui/supplier-badge.tsx` — add `"daily"` tier (blue), update `getSupplierBadge` to accept `dailyRank`, update priority chain, add day to `periodLabels`
- `src/components/RatingsTab.tsx` — add "День" to `Period` type and `PeriodSelector`, add daily bonuses/perks, update `BadgeRules` with full rating formula explanation and blue badge, update mock data generators for day period

