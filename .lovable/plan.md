
# KhaataKitab — Developer Handoff Document (Plan)

I'll produce a single comprehensive Markdown file you can take to VS Code / Cursor / Claude Code / AntiGravity and continue development without Lovable.

## Deliverable

- **File:** `/mnt/documents/KhaataKitab_Developer_Handoff.md` (delivered as a `presentation-artifact` you can download)
- **Format:** Long-form Markdown, no summarization, fully self-contained
- **Length target:** ~8,000–12,000 words

## Document Structure

1. **Project Overview** — vision, problem, current architecture diagram (text), main user flows, key features
2. **Folder Structure** — full tree (`src/`, `supabase/`, `android/`, `public/`) with one-line purpose per file and deeper notes for important files
3. **Database Structure (Dexie v4)** — every table (`transactions`, `receipts`, `settings`, `inventory`, `categoryMappings`), fields, types, indexes, relationships, where each is read/written
4. **SMS System** — full pipeline (`android-sms-plugin.ts` → `sms-reader.ts` → `sms-parser.ts` → `sms-ml-service.ts` → `sms-service.ts` → `SMSConfirmationListener.tsx`), per-file: implementation / works / mocked / missing / replacement plan (real Capacitor SMS receiver plugin)
5. **Receipt System** — `ScanReceiptDialog.tsx`, `pdf-to-image.ts`, `ai-receipt` edge function, `AIConfirmationDialog.tsx`, dead `ocr-service.ts`, confidence threshold (0.6), Needs Review flow
6. **AI System** — Assistant (streaming chat), Categorization, Insights, Receipt Extraction: files, gateway URL, models (`google/gemini-2.5-flash`, `openai/gpt-5-mini`), full system prompts copied verbatim, request/response shapes, error handling (429/402)
7. **Machine Learning System** — Naive Bayes (`classifier.ts`), `keyword-map.ts`, online learning via `saveCategoryMapping`, confidence calculation, correction flow
8. **Inventory System** — schema, UI (`Inventory.tsx`, `AddInventoryDialog.tsx`), transaction linkage fields (`inventoryItemId`, `quantityChange`), current status (no auto-decrement wired)
9. **Authentication System** — current localStorage mock (`AuthContext.tsx`, `Login.tsx`, `Signup.tsx`, `AppLockScreen.tsx`), required migration to Supabase Auth + `profiles` + `user_roles` + RLS with step-by-step replacement
10. **Edge Functions** — `ai-chat`, `ai-categorize`, `ai-insights`, `ai-receipt`: purpose, inputs (JSON shape), outputs, env vars (`LOVABLE_API_KEY`), `verify_jwt = false` warning, CORS handling
11. **Dependencies** — full `package.json` deps + devDeps, Capacitor (`@capacitor/core`, `@capacitor/android`), `pdfjs-dist`, `dexie`, `@supabase/supabase-js`, shadcn/Radix, framer-motion. Marked Required / Optional / Unused; flag missing Capacitor SMS plugin
12. **Environment Variables** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, server-side `LOVABLE_API_KEY`; which are required vs optional
13. **Known Bugs & Tech Debt** — ranked Critical / High / Medium / Low:
    - Critical: mock auth, stubbed Android SMS plugin, edge functions `verify_jwt=false`
    - High: dead `ocr-service.ts`, no cloud sync, no rate-limit UX, inventory auto-decrement missing
    - Medium: AI cost caching, PDF multi-page support
    - Low: README outdated, lint warnings
14. **Priority Implementation Roadmap** — phased plan: Phase 1 (Auth + RLS + cloud sync), Phase 2 (real SMS plugin + background receiver), Phase 3 (harden edge functions), Phase 4 (inventory linkage + reports), Phase 5 (payments + multi-page PDFs + i18n expansion)
15. **Project State Snapshot** — finished / partially finished / mocked / production-ready / next-up tables

## Method

1. Read the remaining files I haven't yet inspected in parallel (`AuthContext`, `sms-*`, `classifier`, `keyword-map`, `ScanReceiptDialog`, `AIConfirmationDialog`, `Ledger`, `Inventory`, `package.json`, `capacitor.config.ts`, `ai-receipt/index.ts`, Android manifest) — read-only, no edits
2. Write the full Markdown to `/mnt/documents/KhaataKitab_Developer_Handoff.md`
3. Emit a `<presentation-artifact>` link

No code or schema changes will be made — this is documentation-only.
