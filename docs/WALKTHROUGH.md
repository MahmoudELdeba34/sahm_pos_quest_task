# Walkthrough Script (12–20 min)

## Part 1 — Product Demo (5–7 min)

1. Open the workspace; point out Sahm branding + Online badge.
2. Watch a live order appear / status change without refresh.
3. Select an order → show detail + advance status.
4. Show AI panel: loading skeletons → failure/retry → streaming text → suggestions.
5. Change kitchen load impact: delayed badge / priority shift.
6. Search products: type, debounce, highlights, arrow keys, category chips, recent searches.
7. Toggle offline → advance an order → show queue + idempotency key → go online → synced.

## Part 2 — Engineering Deep Dive (4–6 min)

1. Feature-based folders and layering (presentation → stores → core).
2. Why Signals + RxJS (not full NgRx for this scope).
3. RealtimeGateway merge of websocket/polling/kitchen streams.
4. OnPush + signals + lazy route + debounce/switchMap/retry/takeUntil.
5. Offline queue persistence and reconnect flush.

## Part 3 — Live Code Navigation (3–5 min)

Walk through:

- `orders.store.ts`
- `realtime-gateway.service.ts`
- `ai-assistant.store.ts` + API
- `product-search.store.ts`
- `offline-queue.service.ts`
- `shared/` badges, skeleton, highlight pipe, list keynav

## Part 4 — Trade-offs (2–3 min)

- Simplified auth/roles and no real LLM.
- Accepted in-memory mock instead of MSW HTTP layer for speed.
- Same store pattern scales to SignalStore/NgRx when team/surface area grows.
- Next: virtual scroll, SW caching, role layouts, contract tests.
