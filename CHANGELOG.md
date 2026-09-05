# CHANGELOG.md
## Auto-generated — 2026-07-18
### Detected from codebase scan

Initial tracking of project changes.

### Vibe Coder Workflow Completion (Phase 4 & 5)
- **Phase 4**: Finalized order confirmation emails via `email.js`. Ensured `paymentMethod` is extracted from the `multipart/form-data` during quote/contact submission and appropriately sent to the store owner. Removed undefined prices in quotes since the Stripe and quote pricing engine was decoupled.
- **Phase 5**: Adjusted splash screen logic in `index.html`, `contact.html`, and `services.html` to leverage `sessionStorage`. The splash animation will only trigger on the first page load per session to improve navigation performance.

---

## Phase - Fix Intro Animation & Cart Upload Errors - 2026-07-29
- Fixed intro animation repeating on page transitions across `index.html`, `services.html`, `contact.html` using `hasSeenSplash` in `sessionStorage` and pre-render inline CSS injection.
- Added 5MB max file size validation and lightweight `URL.createObjectURL` object preview rendering in `script.js`.
- Handled API upload fetch failures gracefully using local object URL fallback, eliminating `Failed to fetch` error popups when adding products with attachments to cart.
- Added `QuotaExceededError` protection to `saveCart()` in `script.js`.
---

## Phase 1 — Convert Checkout to Inquiry Flow & Configure Nodemailer Notifications — 2026-08-26
- **Frontend**:
  - Removed currency selectors (`#currencySelector`) from `index.html`, `services.html`, and `contact.html`.
  - Removed pricing elements (`.product-pricing`, `#modalPrice`, `.price-label`) from `services.html`.
  - Stripped price additions (`(+AED 5.00)`) from option selectors in `script.js`.
  - Transformed Cart modal into an "Order Request List" without financial totals; updated CTAs to "Submit Order Request →".
  - Removed duplicate inline script with dead onrender URL in `contact.html` and consolidated single submit handler in `script.js` with full `FormData` and file attachment support.
- **Backend**:
  - Upgraded `email.js` with luxury branded responsive HTML emails, connection timeouts, and dual-recipient notifications (Client + Admin) for both contact/order inquiries and quote requests.
  - Implemented asynchronous, non-blocking `Promise.allSettled()` email dispatch in `backend/routes/contact.js` and `backend/routes/quote.js`.
  - Cleaned up validation rules in `backend/middleware/validate.js` to decouple obsolete payment method checks.
---

## Phase 2 — Bespoke Editorial Hero & 3D Curved Cylinder Carousel — 2026-08-26
- **Architecture & Motion**:
  - Engineered 3D curved cylinder carousel in pure Vanilla JS and CSS3 without external 3D libraries.
  - Trigonometric radial card placement (`rotateY(angle) translateZ(radius)`) with 2000px perspective and subtle 3D tilt.
  - Interactive pointer drag with momentum physics (friction: 0.94), mouse wheel horizontal scrolling, and idle ambient drift.
- **Editorial Layout & Design**:
  - Replicated 1:1 editorial hero layout from reference video: bold display typography, subheadings, and twin pill actions ("Book a meeting" & "See Projects →").
  - Preserved brand luxury palette (`#050505`, `#181818`, `#C9A84C` gold highlights) and populated cards with high-res 3D print assets.
- **Isolation**:
  - Confined strictly to localhost (`http://localhost:8000/index.html`) without deployment to Vercel production.
---

## Phase 3 — Authentic 3D Concave Product Showcase Carousel Implementation — 2026-08-27
- **Concave Geometry & Physics Engine**:
  - Implemented 3D Concave (inward-curving amphitheater) matrix: $X = R\sin\theta$, $Z = -R(1-\cos\theta)$, $\text{rotateY}(-\theta \times 0.85)$, $\text{scale} = 1 - (1-\cos\theta)\times 0.22$.
  - Normalized relative angles continuously modulo $360^\circ$ into $[-180^\circ, +180^\circ]$ for jitter-free circular looping.
  - Added smooth edge opacity culling ($|\theta| > 58^\circ$) and cosine-based dynamic z-indexing ($Z_{\text{index}} = 1000\cos\theta$).
- **Authentic Catalog Binding**:
  - Populated 16 cards across 8 authentic Apex print product categories with rich captions and high-resolution assets.
- **Verification & Isolation**:
  - Verified 100% on `localhost:8000` via automated Playwright test suite with 0 console errors; zero production deployment.
---

## Phase 1 — Checkout Country Code Sync & Order Confirmation Email Integration — 2026-09-05
- **Frontend / Order Placement**:
  - Bound `#country` selector to `#phone` input in `contact.html` and `script.js`.
  - Added dynamic dial code synchronization for UAE (+971), Saudi Arabia (+966), and Pakistan (+92), updating the phone field's dial code prefix and placeholder upon region change.
  - Implemented regex-based subscriber digit preservation to prevent resetting or mangling valid user-typed numbers on country change.
  - Added focus/click auto-population of the active dial code for empty phone fields.
- **Backend / Mailer Service**:
  - Configured transactional mailer in `backend/services/email.js` using `quotes@apexprinthub.com` for `EMAIL_FROM`, `EMAIL_REPLY_TO`, and `OWNER_EMAIL`.
  - Enforced `from: "Apex Print Hub" <quotes@apexprinthub.com>` and `replyTo: quotes@apexprinthub.com` on all customer transactional confirmation receipts.
  - Routed incoming store owner notifications to `quotes@apexprinthub.com` with customer reply-to headers.
  - Enriched order inquiry confirmation templates with Region and Artwork attachment details.
  - Updated environment templates in `backend/.env` and `backend/.env.example`.
- **Verification**:
  - Created automated Playwright verification suite (`scripts/verify-phase1.js`) validating country code swapping across UAE, Saudi Arabia, Pakistan, and digit retention.
  - Verified full Nodemailer options payload generation and customer/owner email dispatch.
  - Verified 100% pass across existing browser regression suite (`scripts/test-browser.js`).


