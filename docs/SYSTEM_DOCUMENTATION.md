# توثيق النظام الشامل (System Documentation) 📚

هذا الملف يشرح بنية المشروع بالكامل، وكل مكون (Component) أو خدمة (Service) ماذا تفعل، وما هي التعديلات التي قمنا بها مؤخراً لتلبية متطلبات نقطة البيع (POS).

## 1. واجهة المستخدم (Frontend - Angular)

تم تقسيم واجهة المستخدم إلى مجموعة من الـ **Features** المستقلة، كل منها يحتوي على الـ UI الخاص به والـ Store (لإدارة الحالة State).

### 📝 قسم الطلبات (Orders Feature)
* **المسار:** `src/app/features/orders`
* **`OrdersWorkspaceComponent`**: الشاشة الرئيسية للكاشير.
  - **الوظيفة:** عرض الطلبات الحية (Live Orders) في شكل Kanban Board أو Cards، والسماح للكاشير بسحب الطلبات (Drag & Drop) لتغيير حالتها (مثلاً من Preparing إلى Ready).
  - **التعديلات الأخيرة اللي اتعملت فيه:** 
    - تم إزالة حقل اختيار المنتج الواحد البسيط.
    - تم بناء **سلة مشتريات (Cart)** متكاملة تسمح باختيار منتجات متعددة وتغيير كمياتها.
    - تم دمج **شريط بحث ذكي (Autocomplete)** داخل شاشة إنشاء الطلب للبحث عن المنتجات وإضافتها للسلة بسلاسة وبدون تأخير (Debounce Search).
* **`OrdersStore`**:
  - **الوظيفة:** يدير حالة الطلبات محلياً باستخدام **Angular Signals**. يتلقى التحديثات من الـ WebSocket ويحدث الـ UI تلقائياً، ويقوم بتصفية (Filter) الطلبات وتجميعها.

### 🤖 المساعد الذكي (AI Assistant Feature)
* **المسار:** `src/app/features/ai-assistant`
* **`AiAssistantPanelComponent`**:
  - **الوظيفة:** بمجرد تحديد الكاشير لأي طلب، يقوم هذا المكون بطلب اقتراحات ذكية (مثلاً: تنبيه حساسية، اقتراح منتج إضافي).
  - **التقنية:** يعتمد على **Server-Sent Events (SSE)** لاستقبال النص جزءاً بجزء (Streaming) ليعطي إحساس الـ ChatGPT، ويحتوي على زر Retry في حالة فشل الاتصال.

### 🍳 مراقب المطبخ (Kitchen Monitor Feature)
* **المسار:** `src/app/features/kitchen`
* **`KitchenLoadMonitorComponent`**:
  - **الوظيفة:** يعرض نسبة الضغط الحالي في المطبخ (Kitchen Load) ووقت التحضير المتوقع.
  - **الربط:** عندما يرتفع الضغط في المطبخ، يتم وضع علامة (Rush/Delayed) على الطلبات المتأخرة في شاشة الطلبات أوتوماتيكياً.

### 🔍 إدارة المنتجات (Product Search/Catalog Feature)
* **المسار:** `src/app/features/search`
* **`ProductSearchComponent`**:
  - **الوظيفة:** شاشة (CRUD) منفصلة لمدير الفرع تسمح له بالبحث المتقدم عن المنتجات، إضافة منتجات جديدة، تعديل أسعارها، أو مسحها.
  - **التعديلات:** تم الاستعانة ببعض خصائصها (مثل تظليل النص `HighlightMatchPipe` والتنقل بالكيبورد) لاستخدامها داخل سلة المشتريات في شاشة الطلبات.

### 📡 دعم العمل بلا إنترنت (Offline Sync Feature)
* **المسار:** `src/app/features/offline`
* **`OfflinePanelComponent` و `OfflineQueueService`**:
  - **الوظيفة:** في حالة انقطاع الإنترنت، يتم تخزين أوامر الكاشير (مثل تغيير حالة طلب) في الـ LocalStorage. عند عودة الإنترنت، تقوم الـ Service برفع هذه التغييرات للخادم (Sync) مع منع التكرار (Idempotency).

### 🧩 الإطار العام (Workspace & Core)
* **`SmartWorkspaceComponent`**: الغلاف (Shell) الذي يجمع كل المكونات السابقة في شاشة واحدة متكاملة للمستخدم.
* **`RealtimeGatewayService`**: المسئولة عن الاتصال بالـ WebSocket (`Socket.IO`) واستقبال التحديثات الحية وتوزيعها على الـ Stores المختلفة.

---

## 2. الخادم / الباك إند (Backend - Node.js & Express)

الباك إند مبني كخادم وهمي (Mock/Realistic Backend) لتوفير بيئة حية وواقعية لاختبار الفرونت إند.

* **المسار:** `server/`
* **`src/index.ts`**: نقطة البداية للخادم، يقوم بتشغيل الـ Express Server والـ Socket.IO.
  - **التعديلات الأخيرة:** تم إصلاح الـ **CORS Policy** لكي يسمح للفرونت إند (العامل على بورت 4201) بالاتصال بالباك إند بدون مشاكل (`ERR_CONNECTION_REFUSED`).
* **`src/routes/`**: يحتوي على الـ REST API Endpoints (للمنتجات، الطلبات، الـ AI Streaming).
* **`src/socket/gateway.ts`**: يدير اتصالات الـ WebSockets ويبث (Emits) الأحداث للكاشير.
* **`src/socket/simulation.ts`**: **محاكي المطعم (Simulator)**. كود يعمل في الخلفية كل بضع ثواني لالتقاط طلبات عشوائية وتغيير حالتها (مثلاً من Received إلى Preparing) لمحاكاة حركة مطعم حقيقي دون تدخل بشري.

---

## 3. الأنماط المعمارية والقرارات (Architecture Patterns & Trade-offs)

1. **Angular Signals:** تم استخدامها بدلاً من (NgRx) لتقليل الـ Boilerplate وتسريع وقت التطوير، ولأنها توفر Reactivity ممتازة وسريعة متوافقة مع `ChangeDetectionStrategy.OnPush`.
2. **Event-Driven UI:** الواجهة لا تقوم بعمل Refresh أبداً. كل شيء يتغير بناءً على الـ Socket Events من الباك إند.
3. **Idempotency في الـ Offline:** لضمان عدم تنفيذ نفس الطلب مرتين إذا قام الكاشير بالضغط على زر أثناء انقطاع وعودة الإنترنت المتذبذب.
