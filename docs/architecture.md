# Architecture

```mermaid
flowchart TB
  subgraph UI["Presentation (OnPush)"]
    Shell[App Shell]
    WS[Smart Workspace]
    OrdersUI[Orders Workspace]
    AIUI[AI Assistant Panel]
    KitchenUI[Kitchen Monitor]
    SearchUI[Product Search]
    OfflineUI[Offline Panel]
  end

  subgraph Stores["Feature Stores (Signals + RxJS)"]
    OrdersStore
    AiStore[AiAssistantStore]
    KitchenStore
    SearchStore[ProductSearchStore]
  end

  subgraph Core["Core Services"]
    Gateway[RealtimeGatewayService]
    AiApi[AiAssistantApiService]
    ProductApi[ProductApiService]
    OfflineQ[OfflineQueueService]
    Net[ConnectivityService]
  end

  Shell --> WS
  WS --> OrdersUI & AIUI & KitchenUI & SearchUI & OfflineUI
  OrdersUI --> OrdersStore
  AIUI --> AiStore
  KitchenUI --> KitchenStore
  SearchUI --> SearchStore
  OfflineUI --> OfflineQ & Net

  OrdersStore --> Gateway & OfflineQ & Net & KitchenStore
  AiStore --> AiApi & OrdersStore & KitchenStore & Net
  KitchenStore --> Gateway
  SearchStore --> ProductApi
  OfflineQ --> Gateway & Net
  Gateway --> Net
```

## Data flow highlights

1. **Live orders:** Gateway emits envelopes → `OrdersStore` patches signals → OnPush list re-renders only affected bindings.
2. **Kitchen coupling:** Kitchen snapshot delayed IDs → orders computed view upgrades priority badges without imperative refreshes.
3. **AI:** Order selection effect → cancel previous stream → retryable streaming API → suggestion list grows incrementally.
4. **Search:** Input → debounce → switchMap cancels races → highlighted results + keyboard index.
5. **Offline:** Optimistic patch → enqueue with idempotency key → sync on reconnect.
