

# Plan: Complete Remaining Phases — AI Bot Routing, Anonymous Bridge, Multi-Target Rating & AI Audit

## What's Done vs What's Missing

**Already implemented:**
- `rating_rewards` table + `app_ratings` extensions (order_id, rated_profile_id, ticket_id)
- `useRatingRewards` hook with bonus awarding
- `RatingBonusBanner` component
- Rating integration in `OrdersHistory` with bonus rewards
- Supplier customer rating + tier display in `SupplierOrders`
- Reputation multiplier in `useBonuses`

**Still missing (4 major blocks):**

### Block 1: Route Order Actions Through AI Bot
`OrdersHistory.tsx` buttons ("Подати на обмін", "Повернення", "Скарга", "Зв'язатись із менеджером") currently either show a static address or open Telegram. They should open the green `AIChatAssistant` with pre-filled order context.

**Changes:**
- Add global event/state to `AIChatAssistant.tsx`: accept `orderContext` (order_id, order_number, topic: exchange/return/complaint/manager)
- When opened with context, auto-send first message with order details to AI
- In `OrdersHistory.tsx`: replace `handleShowReturnAddress` / `handleContactManager` with opening AI bot with context

### Block 2: Order-Linked Conversations & Supplier Chat View
**DB migration:** Add `supplier_id uuid` column to `support_tickets`

**Changes:**
- `SupportChat.tsx`: When escalating, set `supplier_id` on ticket
- `SupplierOrders.tsx`: Add chat tab showing tickets linked to supplier's orders, grouped by order number. Supplier can respond (sender_role: "supplier")
- Real-time subscription for supplier on their tickets

### Block 3: Multi-Target Rating Prompt + ChatRatingPrompt
**New component: `OrderRatingPrompt.tsx`**
- Full-screen modal triggered when order status → "received"
- Multi-step: rate shop (mandatory) → rate each product → rate manager (if participated) → rate tech support (if participated)
- Detects participants by checking `ticket_messages` sender_roles for related tickets
- Awards bonuses via `useRatingRewards`

**New component: `ChatRatingPrompt.tsx`**
- Shown in `SupportChat.tsx` when ticket closes
- Customer rates manager/support; manager/moderator rates customer
- Reciprocal rating with bonus for customer

**Changes to `SupportChat.tsx`:**
- Add "Закрити тікет" button for staff
- On close → show `ChatRatingPrompt`

### Block 4: AI Audit Reports in Admin Panel
**DB migration:** Create `ai_order_reports` table (id, order_id, supplier_id, report_type, ai_summary, sentiment_score, created_at)

**New edge function: `ai-order-audit/index.ts`**
- Fetches all ticket messages + ratings for an order
- Generates AI summary via Gemini
- Saves to `ai_order_reports`

**New component: `AIOrderReports.tsx`** in admin panel
- Lists reports with sentiment scores
- Filter by supplier/order/date

**Changes to `AdminDashboard.tsx`:** Add "AI Звіти" tab

## Files to Create
- `src/components/OrderRatingPrompt.tsx`
- `src/components/ChatRatingPrompt.tsx`
- `src/components/admin/AIOrderReports.tsx`
- `supabase/functions/ai-order-audit/index.ts`

## Files to Modify
- `src/components/AIChatAssistant.tsx` — accept order context, auto-open with topic
- `src/components/OrdersHistory.tsx` — route actions through AI bot
- `src/components/SupportChat.tsx` — close ticket + ChatRatingPrompt + supplier_id
- `src/components/supplier/SupplierOrders.tsx` — chat tab with order-linked tickets
- `src/pages/AdminDashboard.tsx` — AI reports tab

## DB Migrations
1. Add `supplier_id uuid` to `support_tickets`
2. Create `ai_order_reports` table

## Implementation Order
1. DB migrations
2. AIChatAssistant order context + OrdersHistory routing (Block 1)
3. Supplier chat view + ticket linking (Block 2)
4. OrderRatingPrompt + ChatRatingPrompt (Block 3)
5. AI audit edge function + admin reports (Block 4)

