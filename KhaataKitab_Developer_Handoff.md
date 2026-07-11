# KhaataKitab — Developer Handoff Document

**Version:** 1.0  
**Date:** June 15, 2026  
**Audience:** Developers continuing work outside Lovable (VS Code, Cursor, Claude Code, AntiGravity)  
**Goal:** Single source of truth so a developer with no Lovable access can resume the project end-to-end.

---

## 1. Project Overview

### 1.1 Product Vision
KhaataKitab ("account book" in Hindi) is an **offline-first, AI-assisted bookkeeping app for Indian small vendors and shopkeepers**. It behaves like an agent: it passively captures financial signals (SMS, receipts), classifies them, asks the user to verify, and writes them to a local ledger. Everything works without the internet except optional AI calls.

### 1.2 Core Problem
Indian small vendors juggle UPI, cards, cash and informal credit. They forget to log transactions, paper receipts get lost, and existing apps demand too much manual entry. KhaataKitab automates capture (SMS + receipt scan), uses on-device ML for categorization, and surfaces a trust/verification layer so users keep clean books with minimal effort.

### 1.3 Current Architecture (high level)

```
┌───────────────────────────────────────────────────────────────────────┐
│                        React 18 + Vite SPA                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ Pages (10)   │  │ Components   │  │ Contexts     │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         │                 │                 │                          │
│  ┌──────▼─────────────────▼─────────────────▼───────┐                 │
│  │            Local Services (src/lib)              │                 │
│  │  Dexie DB · SMS parser · ML classifier · OCR     │                 │
│  └──────┬──────────────────┬───────────────────┬────┘                 │
│         │                  │                   │                       │
│   IndexedDB (Dexie)   Capacitor Native    AI Client (HTTP)            │
│         │                  │                   │                       │
│         │             Android SMS Plugin       │                       │
│         │             (STUBBED)                ▼                       │
│         │                              ┌──────────────────────┐        │
│         │                              │ Supabase Edge Funcs  │        │
│         │                              │  ai-chat · ai-cat..  │        │
│         │                              │  ai-insights · -rcpt │        │
│         │                              └─────────┬────────────┘        │
│         │                                        │                     │
│         │                              ┌─────────▼────────────┐        │
│         │                              │ Lovable AI Gateway   │        │
│         │                              │ gpt-5-mini · gemini  │        │
│         │                              └──────────────────────┘        │
└─────────┴───────────────────────────────────────────────────────────────┘
              No cloud DB sync yet. Auth is localStorage mock.
```

**Stack**
- **Frontend:** React 18, Vite 5, TypeScript 5, Tailwind 3, shadcn/ui (Radix), Framer Motion, React Router 6, react-helmet-async, sonner.
- **State/Data:** Dexie 4 (IndexedDB), `dexie-react-hooks`, TanStack Query 5, React Context.
- **Mobile:** Capacitor 7 (Android + iOS scaffolded, Android targeted).
- **Backend (light):** Supabase Edge Functions (Deno) acting purely as an AI proxy. No tables, no auth wired.
- **AI:** Lovable AI Gateway (`https://ai.gateway.lovable.dev`) using `openai/gpt-5-mini` (text + tools) and `google/gemini-2.5-flash` (vision for receipts).
- **ML:** In-browser Naive Bayes classifier + keyword map (no `@huggingface/transformers` runtime usage yet — listed but unused).
- **PDF:** `pdfjs-dist` v6 for client-side PDF→image conversion.

### 1.4 Main User Flows
1. **Onboarding** → 5-screen glassmorphic intro → guided tour overlay.
2. **Add transaction** manually (FAB → `AddTransactionDialog`).
3. **Scan receipt** (FAB → `ScanReceiptDialog`): camera, drag-drop, file pick (JPG/PNG/PDF) → AI extracts → confirmation dialog → save.
4. **SMS automation** (Android only — currently stubbed): native listener → parser → ML classifier → optional AI fallback → confirmation listener → save with `verified: true, source: 'sms'`.
5. **Ledger** view: list, edit, delete, filter.
6. **Insights**: dashboard cards, charts, AI Monthly Summary, AI Snapshot Banner, goal tracker, smart alerts.
7. **AI Assistant**: streaming chat with finance context.
8. **Inventory**: CRUD list (currently isolated from transactions).
9. **Profile**: settings, app lock, language, theme, logout.

### 1.5 Key Features (status one-liners)
- ✅ Local ledger, inventory, goals, alerts
- ✅ Receipt ingestion (camera + drag-drop + JPG/PNG/PDF)
- ✅ Streaming AI chat, AI insights, AI categorization fallback
- ✅ On-device ML (Naive Bayes) with online learning
- ✅ Indian-format currency, i18n shell, glassmorphism UI, onboarding/tour, SEO
- ⚠️ SMS pipeline runs end-to-end in **mock** mode (no real Android plugin)
- ⚠️ Auth is **localStorage-only** (no real backend)
- ⚠️ Edge functions use `verify_jwt = false` (anyone with the URL can invoke)
- ❌ No cloud sync, no payments, no multi-page PDF

---

## 2. Folder Structure

```
khaata-kitab/
├── android/                       # Capacitor Android project (scaffolded, no custom plugins)
│   └── app/src/main/AndroidManifest.xml
├── public/
│   ├── llms.txt                   # Hint file for LLM crawlers
│   ├── robots.txt
│   ├── sitemap.xml
│   └── placeholder.svg
├── supabase/
│   ├── config.toml                # functions.*.verify_jwt = false (all four)
│   └── functions/
│       ├── ai-chat/index.ts       # Streaming chat (SSE)
│       ├── ai-categorize/index.ts # Tool-call classifier
│       ├── ai-insights/index.ts   # Tool-call summary
│       └── ai-receipt/index.ts    # Vision extraction (Gemini)
├── src/
│   ├── main.tsx                   # Entry, mounts <App/>
│   ├── App.tsx                    # Router, providers (Auth, Theme, Lang, Tour, Helmet, Query)
│   ├── index.css                  # Design tokens (HSL vars, glassmorphism)
│   ├── App.css
│   ├── vite-env.d.ts
│   ├── integrations/supabase/
│   │   ├── client.ts              # AUTO-GEN, do not edit
│   │   └── types.ts               # AUTO-GEN, do not edit
│   ├── contexts/
│   │   ├── AuthContext.tsx        # MOCK auth via localStorage
│   │   ├── ThemeContext.tsx       # Dark/light toggle
│   │   ├── LanguageContext.tsx    # i18n (en/hi/hinglish) — strings in-context
│   │   └── TourContext.tsx        # First-launch guided tour state
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── pages/
│   │   ├── Index.tsx              # Dashboard (cards, charts, AI banner, FAB)
│   │   ├── Ledger.tsx             # Transaction list w/ filters + edit/delete
│   │   ├── Insights.tsx           # Charts + AI monthly summary
│   │   ├── Inventory.tsx          # Inventory CRUD
│   │   ├── AIAssistant.tsx        # Streaming chat UI
│   │   ├── Profile.tsx            # Settings, lock, logout
│   │   ├── Login.tsx              # Mock login
│   │   ├── Signup.tsx             # Mock signup
│   │   ├── Onboarding.tsx         # 5-screen intro
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── ScanReceiptDialog.tsx           # Camera + drag-drop + PDF; calls ai-receipt
│   │   ├── AIConfirmationDialog.tsx        # Edit before save (merchant/amount/date/category)
│   │   ├── SMSConfirmationListener.tsx     # Subscribes to parsed SMS → opens dialog
│   │   ├── AddTransactionDialog.tsx        # Manual entry form
│   │   ├── EditTransactionDialog.tsx
│   │   ├── AddInventoryDialog.tsx
│   │   ├── EditGoalDialog.tsx
│   │   ├── TransactionList.tsx
│   │   ├── TransactionTimeline.tsx
│   │   ├── DashboardSummaryCards.tsx
│   │   ├── GoalTrackerWidget.tsx
│   │   ├── SmartAlertBar.tsx
│   │   ├── AISnapshotBanner.tsx            # Cached AI insight on dashboard
│   │   ├── AIMonthlySummary.tsx            # Insights page card
│   │   ├── FloatingActionButton.tsx        # Expandable FAB
│   │   ├── BottomNav.tsx                   # 5-tab nav (mobile-first)
│   │   ├── AppLockScreen.tsx               # PIN gate
│   │   ├── AppLockSettings.tsx
│   │   ├── GuidedTour.tsx                  # Tooltip walkthrough
│   │   ├── TourTooltip.tsx
│   │   ├── OfflineSyncIndicator.tsx
│   │   ├── SEO.tsx                         # react-helmet-async wrapper
│   │   └── ui/                             # shadcn primitives (do not modify shape)
│   └── lib/
│       ├── db.ts                           # Dexie schema v4 + helpers
│       ├── ai-client.ts                    # Edge-function client (chat stream + JSON)
│       ├── ai-insights.ts                  # Stats aggregator for AI insights
│       ├── indian-currency-formatter.ts    # ₹ formatter (lakh/crore)
│       ├── category-suggestions.ts         # Manual category presets
│       ├── pdf-to-image.ts                 # pdfjs first-page → data URL
│       ├── ocr-service.ts                  # DEAD MOCK — delete or replace
│       ├── utils.ts                        # cn() helper (shadcn)
│       ├── sms-parser.ts                   # Regex + keyword parser (works)
│       ├── sms-service.ts                  # Buffer + process + dedupe orchestration
│       ├── sms-reader.ts                   # Sync/scheduling layer over plugin
│       ├── android-sms-plugin.ts           # STUB — pretends to read SMS
│       └── ml/
│           ├── classifier.ts               # Naive Bayes + online update
│           ├── keyword-map.ts              # Seed merchant→category dictionary
│           └── sms-ml-service.ts           # Pipeline: parse → ML → AI fallback → publish
├── capacitor.config.ts             # appId app.khaatakitab.app
├── index.html                      # SEO meta + JSON-LD
├── package.json
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig*.json
├── components.json                 # shadcn config
└── .env                            # VITE_SUPABASE_URL/_PUBLISHABLE_KEY/_PROJECT_ID
```

---

## 3. Database Structure (Dexie / IndexedDB)

DB name: `KhaataKitabDB`. Current version: **4**. Defined in `src/lib/db.ts`.

### 3.1 `transactions`
**Indexes:** `++id, type, amount, date, source, category, verified, isAutoAdded, referenceId, needsReview`

| Field | Type | Notes |
|---|---|---|
| `id` | auto number | PK |
| `type` | `'income' \| 'expense'` | direction in ledger |
| `amount` | number | ₹ (always positive) |
| `description` | string | user-visible label |
| `category` | string | one of the seed categories (free text accepted) |
| `date` | Date | transaction date |
| `source` | `'sms' \| 'receipt' \| 'manual'` | provenance |
| `rawData` | string? | original SMS body or receipt JSON |
| `inventoryItemId` | number? | optional FK → `inventory.id` (not auto-decremented yet) |
| `quantityChange` | number? | sign of inventory delta |
| `verified` | boolean? | true when SMS-verified or user-confirmed |
| `confidence` | number? | parse confidence 0–1 |
| `isAutoAdded` | boolean? | true when auto-added from SMS |
| `verifiedVia` | `'sms' \| 'manual' \| null` | |
| `paymentMethod` | enum | `upi \| debit_card \| credit_card \| netbanking \| wallet \| atm \| neft \| rtgs \| imps \| unknown` |
| `last4Digits` | string? | last 4 of card/account if parsed |
| `referenceId` | string? | UPI/bank reference (also used to dedupe) |
| `categoryConfidence` | number? | ML confidence 0–1 |
| `needsReview` | boolean? | true when parse/AI confidence < 0.6 |
| `createdAt` | Date | row creation time |

**Read by:** `Ledger.tsx`, `Insights.tsx`, `Index.tsx`, `DashboardSummaryCards`, `GoalTrackerWidget`, `SmartAlertBar`, `AISnapshotBanner`, `ai-insights.ts`, `AIAssistant.tsx` (for context).  
**Written by:** `AddTransactionDialog`, `EditTransactionDialog`, `AIConfirmationDialog`, `SMSConfirmationListener`, `sms-ml-service.ts`, `ScanReceiptDialog`.

### 3.2 `receipts`
**Indexes:** `++id, transactionId, createdAt`

| Field | Type | Notes |
|---|---|---|
| `id` | auto number | PK |
| `imageUrl` | string | base64/data URL of source image (or PDF page) |
| `extractedData` | `{ amount?, vendor?, date?, items? }` | from `ai-receipt` |
| `transactionId` | number? | FK → `transactions.id` after save |
| `createdAt` | Date | |

**Used by:** `ScanReceiptDialog` (write-only today; not yet shown in UI).

### 3.3 `settings`
Singleton (one row).
| Field | Type |
|---|---|
| `id` | auto number |
| `smsPermissionGranted` | boolean |
| `cameraPermissionGranted` | boolean |
| `onboardingCompleted` | boolean |
| `smsAutomationEnabled` | boolean |
| `lastSyncDate` | Date? |
| `lastSMSSyncDate` | Date? |

Initialized by `initializeSettings()` on app boot.

### 3.4 `inventory`
**Indexes:** `++id, name, category`
| Field | Type |
|---|---|
| `id`, `name`, `quantity` (number), `price` (number), `unit?`, `category?`, `createdAt`, `updatedAt` | — |

**Used by:** `Inventory.tsx`, `AddInventoryDialog`. **Not auto-linked to transactions yet.**

### 3.5 `categoryMappings` (ML online learning)
**Indexes:** `++id, merchant, category`
| Field | Type |
|---|---|
| `id` | auto |
| `merchant` | string (lowercased on write) |
| `category` | string |
| `confidence` | number (starts 0.7, +0.05 per reuse, capped 1) |
| `timesUsed` | number |
| `lastUsed` | Date |

Helpers: `saveCategoryMapping(merchant, category)`, `getCategorySuggestion(merchant)`.

### 3.6 Relationships
- `transactions.inventoryItemId` → `inventory.id` (informational; no cascade).
- `transactions.referenceId` is the dedupe key for SMS-sourced rows.
- `receipts.transactionId` → `transactions.id` (one-to-one when both saved).
- `categoryMappings.merchant` is matched (case-insensitive + substring fallback) against parsed merchant string during ingestion.

### 3.7 Migration notes
- Version bumps in Dexie must be additive — do **not** drop indexes; users have local DBs.
- If you add cloud sync (recommended), introduce a `serverId`, `updatedAt`, `dirty` triplet on every synced table and reconcile by `serverId`.

---

## 4. SMS System (full pipeline)

### 4.1 Pipeline

```
Android OS
   │  (BroadcastReceiver / ContentResolver)
   ▼
android-sms-plugin.ts        ← currently STUB
   │  raw {address, body, date, id}
   ▼
sms-reader.ts                ← scheduling + permissions
   │
   ▼
sms-service.ts               ← buffer + dedupe + persistence orchestration
   │
   ▼
sms-parser.ts                ← regex + keyword categorization
   │  ParsedSMS
   ▼
ml/sms-ml-service.ts         ← Naive Bayes + (if low conf) AI fallback
   │  enriched ParsedSMS
   ▼
SMSConfirmationListener.tsx  ← opens AIConfirmationDialog
   │  user-edited values
   ▼
db.transactions.add(...)     ← source: 'sms', verified: true
```

### 4.2 `src/lib/android-sms-plugin.ts` (173 LOC) — **STUB**
- Exposes `isAndroid()`, `isNative()`, `checkSMSPermissions()`, `requestSMSPermissions()`, `readSMSMessages(limit, daysBack)`, plus event subscription helpers.
- **Mocked:** On web (`!isNative()`) returns granted permissions, fakes a small set of test SMS via `simulateSMSRead()`. On native it currently **still uses localStorage to fake granted permissions** and the comment reads `// This would use the actual Capacitor SMS plugin`.
- **Missing:** a real Capacitor plugin. Recommended replacements:
  - **Custom plugin (preferred):** write a thin Capacitor plugin (`com.khaatakitab.sms`) that uses Android's `SmsReceiver` (`android.provider.Telephony.SMS_RECEIVED`) for live messages and `ContentResolver` on `content://sms/inbox` for backfill. Permissions: `READ_SMS`, `RECEIVE_SMS`. Add to `AndroidManifest.xml` and request at runtime.
  - **Community plugin (faster):** `@byteowls/capacitor-sms` covers send; for read use `capacitor-sms-inbox` (community) or fork.
- **What works today:** mock permission flow, fake message ingestion suitable for demos.

### 4.3 `src/lib/sms-reader.ts` (171 LOC)
- Wraps `android-sms-plugin` with scheduling: `syncSMSHistory(daysBack)`, `enableLiveListener()`, `disableLiveListener()`.
- Persists `lastSMSSyncDate` in `settings`.
- **Works:** scheduling shell and event fan-out.
- **Missing:** real native event bridge — currently calls the stub.

### 4.4 `src/lib/sms-service.ts` (274 LOC)
- Buffers raw SMS in `localStorage.khaataKitab_smsBuffer`, dedupes by `id` in `khaataKitab_processedSMS` (keeps last 1000).
- `processSMS(raw)` → `isFinancialSMS()` filter → `parseSMS()` → ML enrichment → emits event (consumed by `SMSConfirmationListener`).
- `simulateSMSRead()` injects 3–5 realistic SMS strings for dev/demos.
- **Works:** buffering, dedupe, fan-out. **Missing:** none structurally; just needs real input.

### 4.5 `src/lib/sms-parser.ts` (315 LOC)
Returns `ParsedSMS` with: `amount, direction, method, dateTime, merchant, last4Digits, referenceId, availableBalance, category, categoryConfidence, parseConfidence, needsReview, rawText`.

- Regex for amounts (`Rs/INR/₹`), direction (`credited|debited|sent|received|withdrawn`), method (UPI VPA, card last-4, NEFT/RTGS/IMPS), merchant heuristics (after `at`/`to`/`from`/`@`), reference IDs (UTR/RRN/Txn).
- Keyword map → `CATEGORY_KEYWORDS` (30+ Indian-context categories).
- `isFinancialSMS()` filters by sender DLT codes (`-HDFCBK`, `-SBIINB`, etc.) and amount presence.
- `parseConfidence` heuristic: amount match (+0.4) + merchant (+0.2) + ref id (+0.2) + method (+0.2).
- `needsReview` if `parseConfidence < 0.6` OR `categoryConfidence < 0.5`.
- `maskSensitiveData()` redacts account/card numbers before logging.
- `saveLearnedMapping()` writes to `categoryMappings`.

**Works fully.** Indian-DLT focused; international SMS not supported.

### 4.6 `src/lib/ml/sms-ml-service.ts` (290 LOC)
- `enrichWithML(parsed)`: calls `predictCategory()`; if `confidence < 0.55` AND online, calls `aiCategorize()` (edge function) for fallback.
- Subscribes to `sms-service` events, runs enrichment, then publishes `sms:parsed` window event.
- `recordCorrection(merchant, finalCategory)` calls `updateModel()` and `saveCategoryMapping()` — bound to the confirmation dialog's "Save" path.

### 4.7 `SMSConfirmationListener.tsx`
- Mounted in `App.tsx`. Listens for `sms:parsed`, opens `AIConfirmationDialog` with values prefilled. On confirm → writes transaction with `source: 'sms'`, `verified: true`, `verifiedVia: 'sms'`, `isAutoAdded: false` (because user reviewed). Triggers `recordCorrection`.

### 4.8 Replacement checklist (to make SMS real on Android)
1. Add `READ_SMS` + `RECEIVE_SMS` to `android/app/src/main/AndroidManifest.xml`.
2. Write `SmsPlugin.java` extending `com.getcapacitor.Plugin` with `@PluginMethod` for `requestPermissions`, `read`, `startListening`.
3. Use `BroadcastReceiver` for `SMS_RECEIVED` and `ContentResolver.query(Uri.parse("content://sms/inbox"), ...)` for backfill.
4. In `android-sms-plugin.ts`, swap the stub bodies for `registerPlugin<SmsPlugin>('SmsPlugin')` calls.
5. Test on a physical device (emulator can't receive real SMS).
6. Google Play SMS policy: declared use must match permitted use-case (default SMS handler, OTP, etc.) — KhaataKitab will need a permissions justification doc.

---

## 5. Receipt System

### 5.1 Flow

```
File (JPG/JPEG/PNG/PDF) — drag-drop / file picker / camera capture
       │
       ▼
ScanReceiptDialog.tsx
   • If PDF → pdf-to-image.ts (pdfjs-dist) renders page 1 → JPEG data URL
   • Else  → fileToDataUrl()
       │
       ▼
ai-client.ts → aiReceipt(imageBase64)
       │
       ▼
supabase/functions/ai-receipt  (Lovable AI Gateway, model: google/gemini-2.5-flash)
   returns { merchant, totalAmount, date, category, items, paymentMethod, confidence }
       │
       ▼
ScanReceiptDialog
   • If confidence < CONFIDENCE_THRESHOLD (0.6) → needsReview = true
   • Saves Receipt row + opens AIConfirmationDialog
       │
       ▼
AIConfirmationDialog
   • Editable: merchant, amount, date, category, type
   • Badges: confidence pill (destructive when <60%), "Needs review"
       │
       ▼
db.transactions.add({ source: 'receipt', verified: !needsReview, needsReview, ... })
```

### 5.2 `src/components/ScanReceiptDialog.tsx` (294 LOC)
- Tabs: **Upload** (drag-drop + file input + camera capture button).
- Accepted MIME: `image/jpeg, image/png, image/jpg, application/pdf`.
- Calls `pdfFirstPageToDataUrl` for PDFs (scale 2.0 for OCR fidelity).
- Sets `loading` while AI runs. On error shows toast and lets user retry.
- Constants: `CONFIDENCE_THRESHOLD = 0.6`.
- Reuses `AIConfirmationDialog`; closes itself on submit.

### 5.3 `src/lib/pdf-to-image.ts` (31 LOC)
- Imports `pdfjs-dist/build/pdf` + worker via Vite `?url`.
- `pdfFirstPageToDataUrl(file, scale=2)` → renders to `<canvas>` → `toDataURL('image/jpeg', 0.92)`.
- `fileToDataUrl(file)` — generic helper.
- **Single-page only.** Multi-page PDFs are a known gap.

### 5.4 `src/components/AIConfirmationDialog.tsx` (200 LOC)
- Props: `open, onOpenChange, initial: { merchant, amount, date, category, type, confidence, source, rawData }`, `onSave`.
- Renders editable fields, confidence badge (`destructive` <60%), "Needs review" pill when `<60%`.
- Confirms → calls `onSave({...edited, verified: edited.confidence >= 0.6, needsReview: <0.6})`.

### 5.5 `supabase/functions/ai-receipt/index.ts` (113 LOC)
- Model: `google/gemini-2.5-flash` (vision).
- Accepts `{ imageBase64: 'data:image/...;base64,...' }`.
- Uses an OpenAI-shaped tool call (`extract_receipt`) returning a strict schema; falls back to a JSON-mode prompt if the gateway returns no tool call.
- Returns `{ merchant, totalAmount, date (YYYY-MM-DD), category, items[], paymentMethod, confidence }`.
- Handles 429/402 with descriptive errors.
- CORS enabled. `verify_jwt = false` (insecure default — harden before public launch).

### 5.6 `src/lib/ocr-service.ts` (65 LOC) — **DEAD MOCK**
- Returns a hardcoded `{ amount: 235, vendor: 'Sample Store', items: [...] }`.
- **No callers** remain after the AI rewrite. **Action:** delete the file and remove from imports, OR re-implement using Tesseract.js (`tesseract.js` ~12 MB wasm) as offline fallback.

### 5.7 Known issues
- PDFs > 1 page silently use page 1.
- Large images (>4 MB base64) may hit Gateway request limits.
- No image preprocessing (deskew, crop) — relies on the model.
- No retry-on-rate-limit UX in `ScanReceiptDialog`.

---

## 6. AI System

All AI calls flow through `src/lib/ai-client.ts` → Supabase Edge Functions → Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`). Server-side secret: `LOVABLE_API_KEY` (managed). Client never sees it.

### 6.1 AI Assistant (streaming chat)
- **Files:** `src/pages/AIAssistant.tsx`, `src/lib/ai-client.ts` (`streamChat`), `supabase/functions/ai-chat/index.ts`.
- **Model:** `openai/gpt-5-mini` (overridable via request `model` field).
- **System prompt (verbatim):**
  > "You are KhaataKitab AI — a friendly, concise financial assistant for an Indian small-business bookkeeping app. Speak in plain, simple English (or Hinglish if the user does). Use ₹ for all currency. Format numbers in Indian style (lakhs/crores when relevant). Use markdown sparingly: short paragraphs, bullets when listing. You have access to the user's recent transactions and stats below. Use them to give specific, actionable answers — never invent numbers. If you don't have data to answer, say so honestly. USER FINANCIAL CONTEXT: {context}. Keep responses under 150 words unless the user asks for detail."
- **Data flow:** Page builds a "context" string from recent transactions + monthly totals → POSTs `{ messages, context }` → SSE stream → client parses `data: {choices:[{delta:{content}}]}` chunks → renders into bubble.

### 6.2 AI Categorization (low-confidence fallback)
- **Files:** `src/lib/ai-client.ts` (`aiCategorize`), `src/lib/ml/sms-ml-service.ts`, `supabase/functions/ai-categorize/index.ts`.
- **Model:** `openai/gpt-5-mini` with forced tool call `classify_transaction`.
- **Categories enum (verbatim, 21 items):** Food, Groceries, Transport, Shopping, Bills, Telecom, Entertainment, Medical, Education, Housing, Salary, Sales, Refund, Investment, Loan, Insurance, Fees, ATM Cash, Transfer, Other Expense, Other Income.
- **Returns:** `{ category, confidence (0-1), reason (≤12 words) }`.

### 6.3 AI Insights (monthly summary)
- **Files:** `src/components/AIMonthlySummary.tsx`, `src/components/AISnapshotBanner.tsx`, `src/pages/Insights.tsx`, `src/lib/ai-insights.ts` (stats aggregator), `supabase/functions/ai-insights/index.ts`.
- **Model:** `openai/gpt-5-mini` with forced tool call `financial_summary`.
- **Returns:** `{ headline, mood: 'positive'|'neutral'|'warning', insights[2-4], tips[1-3], topCategory }`.
- **Caching:** `AISnapshotBanner` caches the last response in `localStorage` keyed by month to limit cost.

### 6.4 AI Receipt Extraction
- See §5.5.

### 6.5 Error handling pattern (client)
- `aiError(message, status)` adds `.status`. Components check `err.status === 429` ("rate limited") and `=== 402` ("credits exhausted") to show distinct toasts.

---

## 7. Machine Learning System

### 7.1 `src/lib/ml/classifier.ts` (325 LOC) — Naive Bayes
- Multinomial-style word counts per category in `localStorage.khaataKitab_nbModel`.
- Tokenization: lowercase, strip non-alnum, drop tokens shorter than 2 chars, drop a small stop-word list.
- `predictCategory({ merchant, text, amount, direction })` returns `{ category, confidence }` where `confidence = softmax over log-prob`.
- Cold-start: seeded from `keyword-map.ts` on first run (so confidence > 0 even without history).
- `updateModel(text, category)` — increments word counts and re-persists. Called on every user-confirmed transaction.

### 7.2 `src/lib/ml/keyword-map.ts` (377 LOC)
- Static map of ~250 merchant/keyword → category pairs for India (Swiggy → Food, Tata Power → Bills & Utilities, IRCTC → Transport, etc.).
- Used by both seed training and as a high-confidence shortcut in `predictCategory` (exact match returns confidence 0.95).

### 7.3 Online learning loop
```
User confirms transaction in AIConfirmationDialog
        │
        ▼
sms-ml-service.recordCorrection(merchant, category)
        │
        ├─ updateModel(text, category)            → NB counts
        └─ saveCategoryMapping(merchant, category) → categoryMappings table
```

### 7.4 Confidence calculation
- NB confidence = `exp(top logProb - logSumExp(all logProbs))` clipped to [0.05, 0.99].
- Exact keyword hit overrides to 0.95.
- DB mapping match returns stored confidence (starts 0.7, +0.05 per reuse, max 1.0). Partial mapping match → confidence × 0.8.
- If NB < 0.55 → AI fallback. If AI confidence < 0.6 → `needsReview = true`.

### 7.5 Retraining
- No batch retrain. Model evolves incrementally per correction. To "reset", clear `localStorage.khaataKitab_nbModel`.

### 7.6 Note
`@huggingface/transformers` is in `package.json` but **not imported anywhere**. Treat as future scaffolding or remove.

---

## 8. Inventory System

### 8.1 Schema
See §3.4.

### 8.2 UI
- `src/pages/Inventory.tsx` (183 LOC): list, search, add via `AddInventoryDialog`, edit/delete inline.
- `src/components/AddInventoryDialog.tsx`: name, quantity, price, unit, category.
- Uses `dexie-react-hooks` `useLiveQuery` for reactivity.

### 8.3 Status
- ✅ CRUD against `inventory` table.
- ❌ **Not linked** to transactions despite `transactions.inventoryItemId` and `transactions.quantityChange` columns existing in the schema.
- ❌ No low-stock alerts, no historical price tracking, no SKU/barcode.

### 8.4 Next step
Wire `AddTransactionDialog` (and AI confirmation flow) to optionally select an inventory item; on save, decrement quantity in a Dexie transaction and write the linkage.

---

## 9. Authentication System

### 9.1 Current implementation (MOCK)
- `src/contexts/AuthContext.tsx`: `login(email, password)` accepts **any email** + **password ≥ 6 chars** and writes `localStorage.isAuthenticated = 'true'`.
- `logout()` clears localStorage flags.
- `src/pages/Login.tsx`, `Signup.tsx`: pure UI, both call the mock.
- `src/components/AppLockScreen.tsx` + `AppLockSettings.tsx`: separate **PIN lock** stored in `localStorage` (also insecure).

### 9.2 Required migration to Supabase Auth
1. Replace `AuthContext` to use `supabase.auth.getSession()` + `onAuthStateChange`.
2. `signUp` → `supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })`.
3. `signIn` → `supabase.auth.signInWithPassword`.
4. Add Google OAuth (`supabase.auth.signInWithOAuth({ provider: 'google' })`) — configure provider in Supabase dashboard.
5. Move PIN lock to a *post-auth* gate (still local) or replace with WebAuthn.
6. Add `profiles` and `user_roles` tables (see §10.6 below for SQL skeleton).
7. Enable RLS on every new table.

### 9.3 Files to touch
- `src/contexts/AuthContext.tsx` (rewrite)
- `src/pages/Login.tsx`, `Signup.tsx` (replace mock calls)
- `src/components/AppLockScreen.tsx`, `AppLockSettings.tsx` (keep as second factor)
- `src/App.tsx` (PrivateRoute wrapper)

---

## 10. Edge Functions

All four live in `supabase/functions/` and run on Deno. `LOVABLE_API_KEY` is the only required secret. All use:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-supabase-client-*
```
**Security warning:** `supabase/config.toml` sets `verify_jwt = false` for all four. This is fine for an internal demo but means anyone with the project URL can invoke them. Flip to `true` and validate JWT in code before public launch.

### 10.1 `ai-chat`
- **Purpose:** streaming chat assistant.
- **Input:** `{ messages: [{role, content}], context?: string, model?: string }`.
- **Output:** `text/event-stream` (SSE) of OpenAI delta chunks; `[DONE]` terminator.
- **Errors:** 429 (rate), 402 (credits), 500 (gateway).
- **Env:** `LOVABLE_API_KEY`.

### 10.2 `ai-categorize`
- **Purpose:** classify low-confidence transactions.
- **Input:** `{ text?: string, merchant?: string, amount?: number, direction?: 'credit'|'debit'|'unknown' }`.
- **Output:** `{ category, confidence, reason }`.
- **Env:** `LOVABLE_API_KEY`.

### 10.3 `ai-insights`
- **Purpose:** structured monthly summary.
- **Input:** `{ stats: object, recentTransactions: any[], period?: string }`.
- **Output:** `{ headline, mood, insights[], tips[], topCategory }`.
- **Env:** `LOVABLE_API_KEY`.

### 10.4 `ai-receipt`
- **Purpose:** vision-based receipt extraction.
- **Input:** `{ imageBase64: string }` (data URL).
- **Output:** `{ merchant, totalAmount, date, category, items[], paymentMethod, confidence }`.
- **Env:** `LOVABLE_API_KEY`.

### 10.5 Local invocation pattern (client)
```ts
const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
fetch(`${FN_BASE}/ai-categorize`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}`,
    apikey: VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  body: JSON.stringify({ text, merchant, amount, direction }),
});
```

### 10.6 Recommended new SQL (migration sketch — not yet applied)
```sql
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  language text default 'en',
  created_at timestamptz default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile r/w" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- roles (security-definer pattern)
create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- cloud-synced transactions (mirror of Dexie schema)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id integer,                -- maps to Dexie auto id
  type text not null check (type in ('income','expense')),
  amount numeric not null,
  description text,
  category text,
  date timestamptz not null,
  source text not null check (source in ('sms','receipt','manual')),
  reference_id text,
  verified boolean default false,
  needs_review boolean default false,
  category_confidence numeric,
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "own rows" on public.transactions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index on public.transactions (user_id, date desc);
create unique index on public.transactions (user_id, reference_id) where reference_id is not null;
```

---

## 11. Dependencies

### 11.1 Runtime — REQUIRED
- `react`, `react-dom` 18.3.1
- `react-router-dom` 6.30
- `react-helmet-async` 3.0 (SEO)
- `@tanstack/react-query` 5.83
- `dexie` 4.2 + `dexie-react-hooks` 4.2
- `@supabase/supabase-js` 2.104 (edge function invokes only)
- `framer-motion` 12.23
- `tailwind-merge` 2.6, `clsx` 2.1, `class-variance-authority` 0.7
- `lucide-react` 0.462 (icons)
- `sonner` 1.7 (toasts)
- `recharts` 2.15 (insights charts)
- `date-fns` 3.6
- `react-hook-form` 7.61 + `@hookform/resolvers` 3.10 + `zod` 3.25
- `react-markdown` 10.1 (chat rendering)
- `pdfjs-dist` 6.0 (PDF receipts)
- `@radix-ui/*` (all listed Radix primitives — required by shadcn UI)
- `cmdk`, `vaul`, `input-otp`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `next-themes`, `tailwindcss-animate` — used by shadcn components actually rendered

### 11.2 Runtime — OPTIONAL / TO REVIEW
- `@capacitor/camera` 7.0 — used by `ScanReceiptDialog` camera path; keep.
- `@capacitor/android`, `@capacitor/ios`, `@capacitor/core`, `@capacitor/cli` 7.4 — required if shipping mobile; iOS not actively used.

### 11.3 Runtime — UNUSED (candidates to remove)
- `@huggingface/transformers` 3.7 — not imported. ~10MB. **Remove unless on-device LLM is planned.**

### 11.4 Capacitor plugins — MISSING
- **No SMS plugin installed.** You must add or build one (see §4.8).
- **No background task plugin.** Needed to keep SMS listener alive — recommend `@capacitor-community/background-task` or a custom foreground service.

### 11.5 DevDependencies
Standard Vite + ESLint + TS stack. `lovable-tagger` is Lovable-specific; remove from `vite.config.ts` and `package.json` when leaving Lovable (otherwise harmless).

### 11.6 To install on day 1 outside Lovable
```bash
bun install        # (or npm/pnpm)
bunx cap sync android
```
For real SMS:
```bash
npm i capacitor-sms-inbox    # or your custom plugin
npx cap sync android
```

---

## 12. Environment Variables

### 12.1 Client (Vite, prefixed `VITE_`)
| Name | Required | Used by | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | `ai-client.ts`, `integrations/supabase/client.ts` | Public; baked into bundle |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | same | Anon key, public |
| `VITE_SUPABASE_PROJECT_ID` | optional | tooling | Not used at runtime |

`.env` in repo already contains these. **Do not** put secrets here.

### 12.2 Edge functions (server-side secrets)
| Name | Required | Used by |
|---|---|---|
| `LOVABLE_API_KEY` | ✅ | all four edge functions |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEY` | auto-injected by Supabase runtime | none used in current code, but available |

When migrating off Lovable, you must obtain your own AI provider key. Either:
- Keep using Lovable AI Gateway (requires Lovable workspace credits), OR
- Replace `LOVABLE_API_KEY` with `OPENAI_API_KEY` and change the gateway URL to `https://api.openai.com/v1`. For Gemini vision, swap to `https://generativelanguage.googleapis.com` with `GOOGLE_AI_API_KEY`. Same OpenAI-compatible JSON.

---

## 13. Known Bugs / Tech Debt

### 13.1 Critical
1. **Mock authentication.** Any email + 6-char password works. No real user isolation. (`AuthContext.tsx`)
2. **Stubbed Android SMS plugin.** Native ingestion does not work; demo uses simulated SMS only.
3. **Edge functions accept anonymous requests** (`verify_jwt = false`). Costs and abuse risk.
4. **No cloud sync.** A reinstall wipes a vendor's entire book.

### 13.2 High
5. **Dead `ocr-service.ts`** still imported in older branches; should be deleted to avoid confusion.
6. **Inventory ↔ transactions not wired** despite schema fields existing.
7. **No 429/402 retry UX** in receipt scanner — error toast only.
8. **PIN lock is bypassable** by clearing localStorage.
9. **App lock PIN stored in plaintext localStorage.**

### 13.3 Medium
10. **PDF multi-page** unsupported (page 1 only).
11. **No AI response cache** for `ai-categorize` — same merchant re-queries.
12. **`@huggingface/transformers` bloat** in bundle plan (not currently tree-shaken because not imported, but listed).
13. **No telemetry / Sentry** — silent failures.

### 13.4 Low
14. **README out of date** (no mention of receipts/AI confirmation).
15. **i18n strings inline** in components (no extraction step).
16. **`lovable-tagger` Vite plugin** still in config when leaving Lovable.
17. **Some lint warnings** around `any` types in SMS files.

---

## 14. Priority Implementation Roadmap

### Phase 1 — Trust & Persistence (2–3 weeks)
1. **Real auth (Supabase Auth):** email/password + Google OAuth + email confirmation. Replace `AuthContext`. Add `profiles`, `user_roles` (§10.6). Enable RLS everywhere.
2. **Harden edge functions:** flip `verify_jwt = true` for all four; verify JWT in code; rate-limit per-user (use `LOVABLE_API_KEY` quotas plus an in-table counter).
3. **Cloud sync:** mirror Dexie tables to Postgres. Sync strategy: Dexie remains source of truth offline; on reconnect, push dirty rows by `updated_at`, pull newer-than-last-sync rows. Use `referenceId` for SMS dedupe at server too.

### Phase 2 — Real SMS on Android (2 weeks)
4. **Custom Capacitor SMS plugin** (see §4.8). Background foreground service so the listener survives device sleep.
5. **First-run flow:** ask `READ_SMS` permission with rationale screen; offer backfill of last 90 days.
6. **Notification on auto-add:** Android system notification with "Confirm" / "Edit" actions deep-linking into the confirmation dialog.

### Phase 3 — Receipts & OCR robustness (1 week)
7. **Multi-page PDF** support (iterate pages, send each, merge totals).
8. **Image preprocessing:** auto-orient, deskew, contrast — improves model accuracy on glare/wrinkles.
9. **Offline OCR fallback** via Tesseract.js when offline (delete current `ocr-service.ts` first).
10. **Retry-with-backoff** UX on 429.

### Phase 4 — Inventory & Reports (1–2 weeks)
11. **Inventory linkage** in `AddTransactionDialog` + AI flow; auto-decrement quantity in a Dexie transaction.
12. **Low-stock alerts** (push notifications via `@capacitor/local-notifications`).
13. **PDF/CSV export** of monthly book (use `pdf-lib` or server-rendered PDF for filing).
14. **GST-ready invoice generator** (India-specific, big value-add for vendors).

### Phase 5 — Intelligence & Payments (2–3 weeks)
15. **AI caching layer:** Postgres table `ai_category_cache(merchant, amount_bucket, category, confidence)` to cut LLM cost.
16. **Smarter insights:** weekly digest push notification; YoY/MoM comparisons.
17. **Payments (collect from customers):** Razorpay (preferred for India) or Stripe; generate UPI QR per invoice. Webhook handler as new edge function.
18. **Credit score module:** local computation from cash-flow history + on-time payments.

### Phase 6 — Polish (ongoing)
19. **Telemetry:** Sentry + PostHog (self-hosted-friendly).
20. **i18n extraction** with `i18next` + JSON files. Add Marathi, Tamil, Bengali.
21. **Web/desktop sibling** using the same React shell.

---

## 15. Project State Snapshot

### 15.1 Finished (production-ready or near it)
- Local ledger CRUD (Dexie).
- Inventory CRUD (Dexie, not yet linked).
- SMS regex parser (`sms-parser.ts`) — fully functional given clean input.
- ML classifier with online learning + keyword seed.
- Receipt ingestion UI (drag-drop, upload, camera, PDF).
- AI Confirmation dialog (editable, confidence-aware, Needs Review).
- AI edge functions (chat stream, categorize, insights, receipt).
- AI assistant streaming chat UI.
- Indian currency formatting, glassmorphic design, dark mode, onboarding, guided tour.
- SEO (helmet, sitemap, robots, llms.txt, JSON-LD).

### 15.2 Partially finished
- Inventory (schema fields ready, UI exists, linkage missing).
- i18n (context + toggle work, strings inline).
- App lock (UI + PIN flow, no secure storage).
- Capacitor mobile (Android compiles, no custom plugins).

### 15.3 Mocked
- Authentication (`AuthContext.tsx`) — accept-any.
- Android SMS plugin (`android-sms-plugin.ts`) — simulates messages.
- `ocr-service.ts` — returns fixed sample data; **dead code**.

### 15.4 Production-ready edge with caveats
- Edge functions work but `verify_jwt = false` → anyone can call them. Must be hardened.
- AI gateway costs are uncapped per user.

### 15.5 What to work on next (recommended order)
1. **Real Supabase Auth + RLS + cloud sync** (Phase 1).
2. **Harden edge functions** (verify_jwt true + per-user rate limit).
3. **Real Android SMS plugin** (Phase 2).
4. **Inventory ↔ transactions wiring** (small, high UX value).
5. **Delete `ocr-service.ts`** (10-min cleanup).
6. **Roadmap Phase 3+ as priorities allow.**

---

## 16. Appendix

### 16.1 Run locally (after leaving Lovable)
```bash
git clone <your-repo>
cd khaata-kitab
bun install                 # or npm/pnpm
cp .env.example .env        # add VITE_SUPABASE_* values
bun run dev                 # http://localhost:5173
```

### 16.2 Deploy edge functions (Supabase CLI)
```bash
supabase login
supabase link --project-ref <your-ref>
supabase secrets set LOVABLE_API_KEY=...   # or OPENAI_API_KEY
supabase functions deploy ai-chat ai-categorize ai-insights ai-receipt
```

### 16.3 Build Android
```bash
bun run build
bunx cap sync android
bunx cap open android       # opens Android Studio
```

### 16.4 File-deletion checklist when leaving Lovable
- `vite.config.ts` → remove `lovable-tagger` plugin.
- `package.json` → remove `lovable-tagger` devDep and `@huggingface/transformers` (unused).
- `src/integrations/supabase/client.ts` & `types.ts` → previously auto-generated by Lovable; keep but regenerate from `supabase gen types typescript --linked > src/integrations/supabase/types.ts` when your schema evolves.

### 16.5 Quick smoke test after migration
1. Sign up → log in → land on `/`.
2. Add a manual transaction → appears in `/ledger`.
3. Scan a JPG receipt → AI confirmation opens → save → row added with `source: 'receipt'`.
4. Open AI Assistant → ask "How much did I spend this month?" → streamed response with ₹ amount.
5. Insights page renders AI monthly summary.
6. Offline mode: turn off network → ledger still works; AI features show graceful error.

---

**End of handoff. Good luck — keep the agent loop tight: perceive → reason → verify → learn.**
