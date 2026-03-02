

# Plan: Incentivized Rating System with Bonus Rewards

## What the user wants
Connect the rating/review system to the bonus program so that:
1. **Customers** earn bonuses for leaving reviews (on orders, products, stores, managers)
2. **Suppliers** get markup discounts and promotional advantages for high ratings
3. Everyone is motivated to always rate because it's financially beneficial

## Current State
- `useBonuses.tsx` — manages bonus balance (balance, totalEarned, totalSpent)
- `PersonalBonuses.tsx` — shows "+15₴ за відгук" as a static card but doesn't actually award bonuses
- `BonusAccount.tsx` — mentions "+15₴ за відгук з фото" and "+25₴ за кожне 5-те замовлення" but no real logic
- `OrdersHistory.tsx` — has rating modal that saves to `app_ratings` and `reviews` but never awards bonuses
- `SupplierOrders.tsx` — no customer rating or review incentives
- `app_ratings` table — stores ratings but has no `order_id`, `rated_profile_id`, or `ticket_id`
- No tracking of whether a user already rated a specific order (can spam ratings)

## Implementation Plan

### 1. DB Migration: Extend `app_ratings` + Create `rating_rewards` tracking table

**Extend `app_ratings`:**
- Add `order_id uuid` — link rating to order
- Add `rated_profile_id uuid` — person being rated
- Add `ticket_id uuid` — link to support ticket

**Create `rating_rewards` table** (prevents double-rewarding):
- `id uuid`, `profile_id uuid`, `order_id uuid`, `reward_type text` (review_text, review_photo, store_rating, manager_rating), `amount integer`, `created_at timestamp`
- Unique constraint on `(profile_id, order_id, reward_type)`

### 2. Create `useRatingRewards` hook

Logic for awarding bonuses after rating submission:
- **Customer rewards:**
  - +10₴ for rating an order (store + product)
  - +15₴ if review includes a photo
  - +5₴ for rating a manager or tech support
- Check `rating_rewards` table to prevent duplicates
- Call `useBonuses.addBonuses()` after insert
- Show toast with earned amount: "Ви отримали +15₴ бонусів за відгук!"

### 3. Integrate rewards into `OrdersHistory.tsx` rating flow

- After `handleSubmitRating` succeeds, call `useRatingRewards.awardForOrderReview(orderId, hasPhoto)`
- Show animated bonus notification: "+15₴ 🎉" overlay
- Add visual indicator on rated orders (checkmark on rating button)
- Disable re-rating if `rating_rewards` entry exists for that order

### 4. Add supplier rating benefits display

In `SupplierOrders.tsx` and supplier dashboard:
- Show current average rating prominently
- Display tier benefits based on rating:
  - Rating 4.5+ → markup 28% (instead of 33%)
  - Rating 4.8+ with 50+ reviews → "Verified" badge + markup 25%
  - Most reviews in month → free promo post
- Add "Оцінити клієнта" button on completed orders → saves to `app_ratings` with `rating_type: 'customer'`

### 5. Connect customer reputation to bonus multipliers

In `useBonuses.tsx`:
- Fetch customer's average rating from `app_ratings` where `rating_type = 'customer'`
- Apply multiplier to bonus cap:
  - Rating 4.5+ → bonusCapPercent * 1.2
  - Rating < 3.0 → bonusCapPercent * 0.8
- Show reputation score in `ProfileDashboard.tsx`

### 6. Update `CheckoutDiscounts.tsx` with review incentive banner

- If user has unrated past orders, show banner: "Оцініть минулі замовлення та отримайте до X₴ бонусів"
- Link to orders page

### 7. Supplier markup calculation based on ratings

In `SupplierSettings.tsx` or wherever markup is displayed:
- Fetch supplier's average rating from `reviews` table
- Show current markup tier and what's needed for next tier
- Rules (already defined in BonusAccount):
  - Default: 33%
  - Top monthly: 28% for 1 month
  - Top yearly: 25% for 3 months
  - Rating 4.8+ with 50+ reviews: permanent 28%

## Files to create
- `src/hooks/useRatingRewards.tsx` — bonus awarding logic for ratings
- `src/components/RatingBonusBanner.tsx` — checkout/profile banner for unrated orders

## Files to modify
- `src/components/OrdersHistory.tsx` — integrate reward after rating, disable re-rating
- `src/components/supplier/SupplierOrders.tsx` — customer rating button, rating tier display
- `src/hooks/useBonuses.tsx` — reputation multiplier on bonus cap
- `src/components/checkout/CheckoutDiscounts.tsx` — unrated orders incentive banner
- `src/components/profile/ProfileDashboard.tsx` — show customer reputation score
- DB migration: extend `app_ratings`, create `rating_rewards`

## Reward Summary Table

```text
Action                        | Customer Reward | Supplier Benefit
─────────────────────────────┼─────────────────┼──────────────────
Rate order (store+products)   | +10₴            | —
Review with photo             | +15₴            | —
Rate manager/support          | +5₴             | —
High avg rating (4.5+)        | +20% bonus cap  | Markup 28%
Verified (4.8+, 50+ reviews)  | —               | Markup 25% + badge
Most reviews/month            | —               | Free promo post
Low customer rating (<3.0)    | -20% bonus cap  | —
```

