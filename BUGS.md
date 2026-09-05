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

---

## Phase 1 — Dynamic Phone Dial Code Lock on Checkout/Contact Form — 2026-09-05
- **Symptom**: Selecting a country other than the UAE default (e.g. Pakistan or Saudi Arabia) on the order inquiry/checkout form left the phone dial code locked to +971.
- **Root Cause**: The country select `#country` and phone input `#phone` elements were decoupled in the DOM with no change/input event listeners binding their states.
- **Fix**: Implemented reactive country change listeners in `script.js` mapping `UAE` (+971), `SAR` (+966), `PKR` (+92), and `Other` (+). Used regex extraction to dynamically swap international calling codes while preserving user-typed subscriber digits. Added focus listener to pre-fill active dial codes for empty inputs.
- **Verification**: Verified using automated Playwright test suite `scripts/verify-phase1.js` demonstrating instant switching to +966 for Saudi Arabia, +92 for Pakistan, and +971 for UAE with digit retention.
- **Confidence**: 100% — Fully verified with headless browser automation.

