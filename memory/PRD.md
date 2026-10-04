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

## Auditor Bill Settlement fix (2026-10-02) — VERIFIED by testing agent (5/5 pass)
- ROOT CAUSE: submitAuditorCheck applied wallet deduction + stock change IMMEDIATELY on auditor submit, but stored walletDeducted:false, so confirmAuditBillByCustomer deducted AGAIN = double deduction + double stock reduction.
- FIX: submitAuditorCheck is now estimate-only (no wallet/stock/limit mutation). confirmAuditBillByCustomer applies all effects ONCE on customer approval: missing->wallet deduct (qty*price) + stock reduce + auditMissingHold; return->approveAndCompleteReturn (limit restore + stock reduce + auditor return order); replacement->transfer matched Used item back into In-Stock.
- Verified: submit causes NO change; confirm deducts wallet once (1000->815), return raises limit (8823->9088), second confirm is NO-OP (bill LOCKED). Wallet(1000) & Limit(10000) are independent.

## Pantry Limit & Wallet Statements (2026-10-02)
- Limit model: usedPantryLimit = stockValuation + inTransit + auditMissingHold (missing stays locked, return/pantry-pay free the cap) — matches user's buying-cap model.
- Added PANTRY_PAY_CREDIT ledger entry: every Pantry Pay product payment now writes a Limit Statement row (opening->closing limit) with date+time. Wallet statement already logs AUDIT_DEDUCTION/recharge with date+time. Both statements render date+time in customer Profile (Wallet History + Limit & Ledger tabs). Verified visually.

## Deployment fix (2026-10-02)
- BUILD blocker (per deployer RCA): farm template reads `backend/.env` from env_paths; file was missing → "read envs" PathError. FIXED: created /app/backend/.env (MONGO_URL, DB_NAME, SUPABASE_*), /app/frontend/.env (VITE_*), and /app/.env root (single-process Vite app reads env from root).
- Security: removed ALL hardcoded Supabase credential fallbacks (incl. service-role key) from server/supabase.ts + src/lib/supabaseClient.ts → now env-only with crash-safe guards. Verified app still loads + Supabase creds load from env.
- Not-real-blockers (left as-is): preview supervisor conf (read-only, not in build context) and .gitignore blocking .env (intentional — keeps secrets out of public GitHub; deployer reads from live mount).

## Preview outage fix (2026-10-03)
- CAUSE 1: Environment restart left a stray `node server.js` process squatting on ports 3000+8001, and default backend/frontend supervisor programs revived → new app instance crashed EADDRINUSE. Fix: killed stray pid, stopped default programs, restarted pantrykart.
- CAUSE 2 (deeper, pre-existing): Supabase client NEVER initialized — supabase-js needs native WebSocket (Node 22+), env is Node 20 → createClient threw → cloud sync silently failing all along (also why test data vanished on restarts). FIX: pass `ws` package as realtime transport in server/supabase.ts initClient (+ @types/ws, ws added to package.json deps). Now `connected:true`, cloud sync SUCCESS, state hydrates from Supabase.

## Barcode Details Modal — Reconciliation & Pantry Sold (2026-10-04) — VERIFIED (curl + unit test + UI screenshots)
- Quick Sold mix-up FIXED: getCustomerPantryHoldings now counts ONLY delivered PANTRY orders + physical pantryCardItems — QUICK/COD delivered orders no longer appear as "Pantry In-Stock" (they are outright sales). Cancelled orders excluded from quick/pantry usage.
- Semantics per user: Pantry Sold = Pantry-Pay consumed + Auditor Missing (customer-CONFIRMED/LOCKED bills only, walletDeducted=true). Pantry In-Stock = pantry-cart delivered, unconsumed. Quick orders → Quick Sales.
- getBarcodeFullLifecycleDetails: new summary fields totalPantryInStock / totalPantryPayConsumed / totalAuditorMissing; totalPantrySold now = consumed (ppay+missing); revenue uses totalPantryDelivered internally. New consumptionHistory[] (PANTRY_PAY from successful product payments with batch attribution via customer pci; AUDITOR_MISSING confirmed bills; AUDITOR_RETURN completed returns) — all timestamped.
- Per-batch AUTO-CALC: quickSold/pantryOut/returned derived from real order/return records (counter fallback when no records); new fields pantryInStockQuantity, pantryPayConsumedQuantity, auditorMissingQuantity.
- PantryPayment now stores quantity (payload.quantity || 1) for product payments.
- UI (BarcodeDetailHistoryModal): clickable "Pantry Sold" KPI card (scrolls to history), "Pantry-Pay Consumed" + "Auditor Missing" KPI cards; Quantity Reconciliation box (data-testid quantity-reconciliation-box, user's exact formula: Purchased = Available + Quick Sold + Pantry In-Stock + Returned + Pantry-Pay Consumed + Auditor Missing; Available counted excl. restored returns; damage/expiry excluded; Matched/Variance badge); Consumption & Audit History box (consumption-history-box, timestamped entries); batch table replaced with "Batch-Wise Inventory Lifecycle & Shopkeeper Traceability" report — exact user columns: Product Name, Barcode, Batch Number, MFG & EXP, Purchased, Quick Sold, Pantry Sold, Returned, Available (+per-batch Recon ✓/Variance badge), Shopkeeper Source.
- FIXED modal infinite loading: api.ts Supabase read-layer bypass extended to /api/pantry/active-holdings, /api/inventory/barcode/:b/details, /api/batches/:id/details (computed routes must hit live Express; Supabase layer 400-hanged on purchases.barcode).
- Verified live: barcode 123456789 Fully Matched 18/18; Maggi quick items no longer in pantry stock; unit test of real function against rich local data detected PANTRY_PAY/AUDITOR_MISSING/AUDITOR_RETURN entries correctly (variance flags genuine legacy double-counts).

## Batch Modal Parity + In-Transit + Pantry Pay Live Test (2026-10-04) — VERIFIED (curl POST + unit test + UI screenshots)
- IN-TRANSIT VISIBILITY: new summary field totalPantryInTransit (both barcode & batch) = PANTRY units stock-deducted (item assignmentStatus LOCKED) in orders not yet DELIVERED/terminal. Reconciliation box now shows a dedicated amber info row (data-testid recon-in-transit-row / batch-recon-in-transit-row) explaining it's a TEMPORARY variance that becomes Pantry In-Stock on delivery; formula/accounted include + In-Transit term. Unit test confirmed SRF-201 went from variance=1 → 0 with in-transit=1.
- BATCH MODAL PARITY: getBatchFullLifecycleDetails now returns consumptionHistory[] + summary fields totalPantryInStock/totalPantryInTransit/totalPantryPayConsumed/totalAuditorMissing with same semantics as barcode (Pantry Sold = ppay + confirmed Auditor Missing; revenue uses delivered-out internally). BatchDetailHistoryModal got the identical Quantity Reconciliation box (batch-quantity-reconciliation-box, batch-recon-* testids) + Consumption & Audit History box (batch-consumption-history-box). Verified Batch #124001 Fully Matched 8/8.
- PANTRY PAY LIVE TEST: POST /api/pantry-payments (Horlicks 123456789, CUS-000001, qty 1) → Pantry Sold 0→1, Pantry-Pay Consumed 0→1, Pantry In-Stock 1→0, recon stayed Fully Matched 18/18, new timestamped PANTRY_PAY entry in Consumption History. Confirmed live in both API and UI.
- BUG FIXED (found during live test): getCustomerPantryHoldings counted CONSUMED_AND_PAID / RETURNED pantryCardItems (which keep qty>0 for history) as live in-stock → double-counted a consumed unit as both ppay AND in-stock (variance −1). Fix: section-1 now skips status CONSUMED_AND_PAID and RETURNED. After fix recon = 18/18.
- NOTE: in-memory test payments are wiped on service restart (state re-hydrates from Supabase cloud); run Pantry Pay tests without an intervening restart.

## Auditor Missing Live Flow + Variance Investigator (2026-10-04) — VERIFIED (curl flow + UI screenshots)
- AUDITOR MISSING LIVE TEST: submitAuditorCheck (PCI-002 ATT-801, qtyMissing=1) → bill CUSTOMER_PENDING_CONFIRMATION → confirm-bill (customer CUS-000001) → bill LOCKED. Result: Auditor Missing 0→1, Pantry Sold 0→1, Pantry In-Stock 1→0, Consumption History got AUDITOR_MISSING entry (₹265, timestamped). Reconciliation stayed consistent (no NEW variance created — missing simply moved a unit from in-stock to missing).
- VARIANCE INVESTIGATOR (Audit Review): new summary field totalReconciledAdjustment (barcode); new db collection reconciliationAdjustments[]. Backend getReconciliationReview() scans every barcode, flags those whose Purchased ≠ accounted (incl in-transit + resolved adjustments). resolveReconciliationVariance() records a signed ReconciliationAdjustment (category SHRINKAGE/LEGACY_DATA/DAMAGE_UNTRACKED/MANUAL_CORRECTION/OTHER) + AuditLog, defaulting to the exact open variance so it balances to 0.
- Endpoints: GET /api/inventory/reconciliation-review, POST /api/inventory/reconciliation-resolve (both bypass Supabase read-layer in api.ts). Barcode recon box formula now includes "+ N (resolved)" term.
- UI: new ReconciliationReviewModal.tsx opened via "Audit Review" button (data-testid open-variance-review-btn) in BatchInventoryManagement header. Lists flagged barcodes with full breakdown, per-item Resolve → write-off dialog (category + reason). Clicking a barcode opens its full lifecycle modal.
- Verified live: 12 scanned / 6 flagged (legacy seed gaps). Resolved ATT-801 (+1) → variance 0, flagged 6→5; UI resolve of Good Day (+2) → flagged 5→4, item dropped from list.
- CAUGHT & FIXED a build-blocker during this work: an insert broke a JSDoc comment opener above getCustomerPantryHoldings → tsx transform failed → server silently fell back to STALE dist/server.cjs (new routes 404'd). Fixed comment; always watch /var/log/supervisor/frontend*.log for "tsx failed, falling back to dist bundle".

## Instant Load / No Sync Wait (2026-10-04) — VERIFIED (browser timing tests)
- Problem: app open hote waqt client-side Supabase read-layer (supabaseFallback.ts) pehle cloud se "sync" karti thi — dashboard pe ZEROS dikhte the jab tak background preheat/seed storm complete na ho; har API call pehle virtual layer ko poochti thi.
- Fix: naya `isLiveBackendAvailable()` probe (GET /api/health, 1.5s timeout, JSON content-type check, 30s retry TTL on failure, success cached for session). Jab live Express backend mile → (1) fetchJson har route ko seedha Express se laata hai, virtual layer sirf tab jab backend ho hi na (static/Vercel hosting fallback preserved, incl. non-OK Express response fallback), (2) module-load Supabase preheat/seed storm completely skip hota hai.
- Naya route: GET /api/health (server.ts).
- Measured: page load → login form 0.5s; login → dashboard shell 1.0s; real stats 1.1s after login (pehle zeros → sync ke baad populate); customer portal full catalog instant. Console me "Failed to fetch" PostgREST storm = 0 warnings.

## Auditor Active Stock — Physical Check Checkbox Tracker (2026-10-04) — VERIFIED (UI screenshots)
- Auditor Portal → Active Stock tab me har item card par "Check / Checked" toggle button (data-testid auditor-check-item-{id}). Tick karne par card emerald highlight + "VERIFY DONE" badge; untick se wapas pending.
- Upar "Physical Check Progress" strip (auditor-check-progress): live progress bar + "✓ Checked: X" (auditor-checked-count) + "Pending: Y" (auditor-pending-count) + percentage.
- UI-only aid (user requirement: koi business logic impact nahi) — itemStatuses/bill/settlement untouched. State sirf localStorage (pm_audit_checklist) me; audit submit hone par auto-reset. Refresh par persist.
- Verified: 5 active items, tick→1/4→2/3 (40% bar), untick→1/4, reload persistence ✓.

## Pending-Only Filter (2026-10-04) — VERIFIED (UI screenshots)
- Active Stock toolbar me "Pending Check (N)" toggle (data-testid auditor-pending-only-toggle) — ON karne par sirf unticked (physically unchecked) items dikhte hain; counter "3 of 5" live update hota hai.
- Sab checked hone par emerald empty-state: "Sabhi products physically check ho gaye ✓" + "Show All Items" (auditor-all-checked-msg). Reset Filters ab pending-only bhi clear karta hai.
- Verified: 2 tick → Pending Check ON → 3 visible; sab tick → all-checked message; Show All → 5 wapas.

## Checklist Summary in PDF Report (2026-10-04) — VERIFIED (UI screenshot)
- AuditorWorkPdfReport me naya optional prop `physicallyCheckedIds` (sirf live draft workspace report ke liye; past/submitted audits ke liye undefined → badges hidden).
- PDF table header me "✓ Physically Checked: X/Y" summary chip (pdf-physically-checked-summary) aur har item ke Product cell me badge (pdf-physical-check-{id}): "✓ Physically Checked" (emerald) / "Pending Physical Check" (slate).
- AuditorPortal se `physicallyCheckedIds={pdfReportAudit ? undefined : checkedItemIds}` pass hota hai.
- Verified: 2 items tick → PDF me 2/7 summary + sahi items par green badges.

## Backlog / Next
- P0: NATIVE EMERGENT DEPLOY NOT SUPPORTED for this stack (Node/Express/Vite/Supabase single-process). Emergent only deploys FastAPI(Python) or Next.js backends + MongoDB. Options: (A) deploy externally on Vercel/Render/Railway via GitHub, set Supabase env secrets there; or (B) full rebuild on FastAPI+React+Mongo template. App runs fine in PREVIEW; only native prod deploy is unsupported.
- P1: Real Razorpay keys to replace demo gateway
- P1: Backfill date/time on OLD seed ledger entries
- P1: Other DEMO integrations (MSG91 SMS, WhatsApp, Google Maps)
- P2: Push code to GitHub repo pantrykartlive-12345 via Save to GitHub UI
