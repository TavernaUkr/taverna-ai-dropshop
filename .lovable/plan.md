

## Problem Analysis

1. **Missing gear icon**: In `MyShops.tsx`, each shop card has two buttons ("Замовлення" and "Налаштування") but no prominent **⚙️ gear icon** next to the shop name/header for quick access to store editing (as you requested).

2. **Dev/test role sync issue**: When using DevRoleSwitcher with `supplier` role, the `fetchShops` function queries `suppliers` by `profile?.telegram_id` which is `123456789` (fake dev user). This returns no results because no suppliers exist with that telegram_id. The page shows "Магазинів ще немає" even though the role is "supplier".

## Plan

### 1. Add gear icon to each shop card in MyShops.tsx

For each shop where `role === "owner"` (or in dev environment for supplier test role), add a **⚙️ Settings gear button** in the top-right corner of each card, next to the shop name. This button navigates to `/store-management/{shopId}` (full editing: avatar, banner, info, reviews, policies, manager assignment).

Restructure the card layout:
- Shop header row: avatar + name + badge + **⚙️ gear icon** (top-right, only for owners)
- Stats row: products count, reviews count, active/inactive badge
- Action buttons row: "Замовлення" + "Відгуки" (both roles get these two buttons)

The gear icon is the key differentiator: owners see it, managers do not.

### 2. Fix dev/test sync for supplier role

In `fetchShops`, when in Lovable dev environment AND `effectiveRole === "supplier"`, fetch **all active suppliers** as mock owned shops (since there's no real telegram_id match). This ensures the UI shows shops for testing.

Logic:
```
if dev environment AND effectiveRole === "supplier" AND no shops found by telegram_id:
  → fetch first 3 active suppliers as "owner" shops for UI testing
```

### 3. Keep manager mode unchanged

For `shop_manager` role, the gear icon is hidden. They see "Замовлення" and "Відгуки" buttons only. The "Відгуки" button navigates to `/store-management/{shopId}?mode=manager` (read-only header, reviews tab only).

### Files to modify

- **`src/pages/MyShops.tsx`**: Add gear icon per card, fix dev fallback for supplier test role, restructure action buttons.

