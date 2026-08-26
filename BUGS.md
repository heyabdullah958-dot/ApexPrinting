# BUGS.md
## Auto-generated — 2026-07-18
### Detected from codebase scan

Initial tracking of project bugs and fixes.

---

## Phase 1 — Duplicate Contact Form Handler & Hardcoded OnRender URL — 2026-08-26
- **Symptom**: `contact.html` contained an inline `<script>` with hardcoded `https://apex-printing-backend.onrender.com` which attached a duplicate submit listener to `#contactForm`. This caused double submission events and failed requests when the old Render backend was unreachable.
- **Root Cause**: An earlier prototype script was left at the bottom of `contact.html` alongside `script.js`.
- **Fix**: Removed the obsolete inline script in `contact.html` and consolidated all form handling in `script.js` using dynamic `API_BASE_URL` with unified `FormData` parsing, error boundaries, and toast notifications.
- **Verification**: Verified contact form submission path and tested backend `/api/contact` route.
