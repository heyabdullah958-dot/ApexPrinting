# BUILD.md
## Auto-generated — 2026-08-26
### Detected from codebase scan

### Frontend Build & Run
- Static HTML/CSS/Vanilla JavaScript (no bundler required for local dev).
- Local dev server: standard static HTTP server (e.g. `http://localhost:8000`).
- Export scripts: `node scripts/export-clean-code.js` and `python export_clean.py`.

### Backend Build & Run
- Node.js + Express backend located in `/backend`.
- Dev script: `npm run dev` (nodemon server.js on port 3000).
- Prod run: `npm start` (`node server.js`).
- Production target: Vercel deployment (`https://apex-printing.vercel.app`).
- Database & Storage: Supabase (PostgreSQL & storage buckets).

---

## Phase 1 — Country Dial Code Sync & Transactional Email Push — 2026-09-05
- Verified local test suites with Playwright (`scripts/verify-phase1.js` and `scripts/test-browser.js`).
- Committed and pushed to GitHub remote `origin/master` (`heyabdullah958-dot/ApexPrinting`).
- Automatically triggers Vercel serverless deployment pipeline at `https://apex-printing.vercel.app`.
- Environment configuration: `quotes@apexprinthub.com` configured for `EMAIL_FROM`, `EMAIL_REPLY_TO`, and `OWNER_EMAIL`.
