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
