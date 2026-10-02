# PantryKart Live (PantryMaster ERP) — PRD

## Original Problem Statement
Continue development of uploaded codebase (remix-2-nd.zip): PantryKart Live — Grocery E-Commerce, Batch-wise Inventory, Customer Pantry Card credit system, Quick Order COD, Delivery tracking, and Auditor Field Verification platform. GitHub repo: gstranchi64-pantrykart/pantrykartlive-12345

## Architecture
- Single-process app: Express + Vite middleware via `tsx server.ts` on port 3000 (supervisor program: pantrykart)
- Frontend: React 19 + TypeScript + Tailwind CSS v4 + Lucide + Recharts + Motion
- Backend: Express (server.ts, ~1600 lines), business logic in server/businessLogic.ts
- Storage: In-memory/JSON store (data/db.json) synced to Supabase cloud (project bgxnmmecjcgrwtemmjtz, LIVE mode)
- Auth: Mobile OTP (demo bypass: 123456)
- AI: Gemini API integration (server-side, DEMO mode without key)

## User Personas
- ADMIN: Full ERP control (stock, orders, finance, auditors, themes, integrations)
- CUSTOMER: Storefront, pantry card, wallet, quick COD orders
- DELIVERY_BOY: Dispatch, delivery confirmation, COD collection
- AUDITOR: Field verification, audit bills, return claims

## Core Requirements (existing)
- Batch-wise inventory with expiry tracking, FIFO allocation
- Pantry Card credit ordering + Quick COD ordering (dual-track)
- Pantry Pay wallet + credit ledger
- Auditor field verification with bill locking
- Multi-panel responsive UI (customer mobile-first, admin desktop, auditor tablet)

## Implemented / Verified (2026-10-02)
- Environment set up: npm install, supervisor program `pantrykart` created (single process listens on 3000 for Vite + 8001 for ingress /api). Default backend/frontend programs are permanently FATAL (no /app/backend|frontend dirs) so no port conflict.
- App verified live: login page + Admin dashboard with live Supabase data
- Auth API verified: verify-mobile + verify-otp flow working

## Pantry Pay enhancement (2026-10-02)
- Added REAL camera barcode scanning: new src/components/customer/BarcodeCameraScanner.tsx (html5-qrcode), wired into PantryPayScannerUI via "Scan via Mobile Camera" button (data-testid pantry-pay-camera-scan-button). Scanned barcode routes through existing handleBarcodeSearch so ONLY home-pantry-stock items are accepted.
- Fixed CRITICAL crash: scanner teardown now guards getState() + wraps stop()/clear() in try/catch + startedRef prevents React 19 StrictMode double-start (previously crashed whole app via ErrorBoundary when camera unavailable).
- Fixed browser /api 502: Express now also listens on 8001 so the platform ingress (/api -> 8001) reaches the API from the public preview URL. Verified POST+GET /api/pantry-payments end-to-end via preview URL (200).
- Razorpay kept as DEMO/simulated popup (user has NO real Razorpay keys — confirmed). Backend createPantryPayment consumes pantry stock -> CONSUMED_AND_PAID "used" record and logs to customer/admin/auditor history (verified via curl).

## Bug Fix: Pantry Pay "Used/Consumed" not showing (2026-10-02)
- ROOT CAUSE: browser read pantry-card via Supabase fallback layer which derives items from orders only (never reflects Pantry Pay). Writes went to Express local store. Split-brain read/write.
- FIX 1 (api.ts): bypass handleDirectSupabaseFetch for /api/pantry-card/* and /api/pantry-payments* routes → browser now uses live Express backend (single source of truth).
- FIX 2 (badge display): CONSUMED_AND_PAID records store the PAID quantity (qty>0), so badges keyed on qty===0 wrongly showed "IN PANTRY STOCK". Fixed in CustomerProfileModal, PantryCardPortal, admin CustomerManagement → now show "USED / CONSUMED & PAID (N Units)".
- FIX 3 (auditor portal): used-tab filters + replacement used-item matching now include status CONSUMED_AND_PAID (previously only qty===0).
- VERIFIED E2E in browser: paid Horlicks ₹285 via demo Razorpay → instantly moved to Used tab (4→5), Payment History (4) loads, stats correct. Used badges render correctly.

## Backlog / Next
- P1: Real Razorpay keys (user to provide rzp_test / rzp_live key_id + secret) to replace the demo gateway with a genuine create-order + signature-verify flow
- P1: Other DEMO integrations (MSG91 SMS, WhatsApp, Google Maps)
- P2: Push code to GitHub repo pantrykartlive-12345 via Save to GitHub UI
- Minor: Pantry Pay error message visibility (renders below pills; add scrollIntoView)
