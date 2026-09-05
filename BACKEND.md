# BACKEND.md
## Auto-generated — 2026-07-18
### Detected from codebase scan

Express JS backend serving as API for Apex Print Hub.
Integrates with Supabase for DB, Nodemailer for emails.

---

## Phase 1 — Dual-Recipient Nodemailer Notifications & Resilient Submission Pipeline — 2026-08-26
- Upgraded `backend/services/email.js` with responsive luxury HTML styling (matching `#0a0a0a` & `#C9A84C` Apex Print Hub theme), connection timeouts, and dual-recipient dispatch (`notifyOwnerNewContact`, `confirmCustomerContact`, `notifyOwnerNewQuote`, `confirmCustomerQuote`).
- Refactored `backend/routes/contact.js` and `backend/routes/quote.js` to dispatch dual emails asynchronously via non-blocking `Promise.allSettled()`.
- Implemented graceful Supabase error logging so transient database connection errors do not abort API responses or customer email triggers.
- Updated `backend/middleware/validate.js` to sanitize inputs and remove obsolete payment method validations.
- Verification: Executed simulated HTTP requests against `/api/contact` and `/api/quote`; both returned HTTP 200 with standard API response payloads.
- Confidence: 98% — Verified endpoint responses and email module exports.

---

## Phase 1 — Multi-File Artwork Pipeline & Dynamic Attachment Notification — 2026-09-05
- Replaced `upload.single('design_file')` with `upload.any()` in `backend/routes/contact.js` to accept both multiple itemized cart artworks (`cart_artworks`) and optional standalone contact form uploads (`design_file`).
- Handled incoming `cart_data` JSON payload and formatted multi-file lists with file names and sizes directly into order message specifications.
- Upgraded `notifyOwnerNewContact` and `confirmCustomerContact` in `backend/services/email.js`:
  - `mailOptions.attachments` maps over all uploaded files (`data.files`) to attach all binaries to the owner notification.
  - HTML summary tables display all attached file names and file sizes for both the customer confirmation and the owner notification.
- Files modified: `backend/routes/contact.js`, `backend/services/email.js`
- How it was verified: Automated Playwright test suite `scripts/test-artwork-flow.js` verifying successful multipart form post with multiple files to `/api/contact` returning HTTP 200.
## Production Release — Cloud Artwork Parsing, Supabase Ingestion & Transactional Email Actions — 2026-09-06
- **Cloud Artwork URL Parsing (`backend/routes/contact.js`)**:
  - Parsed incoming `cart_data` JSON payload from multipart form submission.
  - Filtered items containing valid cloud-hosted artwork links:
    `item.design && item.design.url && (item.design.url.startsWith('http://') || item.design.url.startsWith('https://'))`
  - Injected structured specifications into the submission message text for logging and prepress clarity:
    ```text
    [Cloud-Hosted Print Artwork (N)]:
      1. <Product Title>: <filename> (<size> MB) — <public_cdn_url>
    ```
  - Standardized file size rendering in MB (`(size / (1024 * 1024)).toFixed(2)`).
- **Supabase Database Persistence**:
  - Preserved enriched message payload in `contact_submissions` table containing the itemized cloud asset CDN links alongside customer contact attributes (`name`, `email`, `phone`, `country`, `service`, `payment_method`).
  - Wrapped Supabase REST operations in resilient try/catch blocks to ensure network drops or transient database warnings log non-destructively without blocking user HTTP 200 responses.
- **Luxury Nodemailer Email Templates with Gold Download Buttons (`backend/services/email.js`)**:
  - **Store Owner / Production Notification (`notifyOwnerNewContact`)**:
    - Detects `data.cartData` containing cloud artwork URLs.
    - Injects a luxury dark-gold styled card section: `☁️ Cloud-Hosted High-Resolution Print Artwork:` positioned prominently above customer details.
    - Renders an itemized table with columns for Product Name, Attached File Name, File Size, and Action.
    - Features a high-visibility luxury gold button (`#C9A84C` background, `#000000` text, 6px 14px padding, bold 12px) linking directly to the CDN proof: `Download File ↗`.
  - **Customer Order Inquiry Confirmation (`confirmCustomerContact`)**:
    - Added an itemized "Cart Artwork" overview table in the request summary.
    - Injected reassuring prepress receipt messaging: `🎨 Uploaded Production Artwork:` stating that all high-resolution print files are securely archived for prepress review, with direct proof download buttons.
  - RFC 5322 Email Routing: Enforced `replyTo: quotes@apexprinthub.com` for customer receipts and `replyTo: data.email` for owner notifications.
- Files modified: `backend/routes/contact.js`, `backend/services/email.js`.
- How it was verified: Unit test suite `tests/unit-email-contact.test.js` (5/5 passing) and end-to-end suite `scripts/test-artwork-flow-production.js` (9/9 stages passing).
- Confidence: 100% — Fully verified with backend automated test suites.
---

