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

## Phase 1 — Cart Artwork Persistence Loss and Missing Checkout Design Flow — 2026-09-05
- **Symptom**: Attached artwork files and previews in the cart disappeared when users navigated from `services.html` to `contact.html` via "Submit Order Request". The checkout/contact page did not display any of the uploaded designs or itemized configurations, and multiple files could not be submitted together.
- **Root Cause**: Product modal file uploads were creating ephemeral `URL.createObjectURL(file)` instances that were garbage-collected upon document navigation. Furthermore, `contact.html` lacked an order review component and its form only accepted a single file input (`upload.single('design_file')`).
- **Fix**:
  1. Built an IndexedDB persistence engine (`ApexPrintHubDB`, store `artworks`) that preserves raw binary `File` objects across page navigations and sessions without memory limits.
  2. Implemented HTML5 canvas downsampling to generate ultra-lightweight Base64 thumbnail data URLs stored on `item.design.previewUrl` in `localStorage` for instant synchronous rendering.
  3. Added an itemized `#checkoutOrderReview` panel to `contact.html` with image thumbnails, document badges (PDF/AI/PSD), option badges, and delete buttons.
  4. Updated `contactForm` submission to bundle all IndexedDB binary files under `cart_artworks` alongside `cart_data` and any standalone file.
  5. Updated backend route to `upload.any()` and Nodemailer services to attach all files and list them in email summaries.
- **Verification**: Verified via Playwright automated test suite `scripts/test-artwork-flow.js` covering multi-file upload, cart drawer rendering, navigation to `contact.html`, visual preview persistence, multipart form post, and cache purging.
- **Confidence**: 100% — Fully verified with automated browser testing.
---
