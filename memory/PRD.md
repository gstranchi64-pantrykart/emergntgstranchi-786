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
- Environment set up: npm install, supervisor program `pantrykart` created (default backend/frontend stopped)
- App verified live: login page + Admin dashboard with live Supabase data (7 customers, 16 products, 12 pantry orders)
- Auth API verified: verify-mobile + verify-otp flow working

## Backlog / Next
- P0: Awaiting user direction on which feature to continue building
- P1: Real integrations (MSG91 SMS, Razorpay, WhatsApp, Google Maps) — currently DEMO mode
- P2: Push code to GitHub repo pantrykartlive-12345 via Save to GitHub UI
