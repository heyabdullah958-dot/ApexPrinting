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
## Phase 1 — Cart Artwork Persistence & Checkout Design Flow Fix — 2026-09-05
- **Client-Side Artwork Engine & Storage Architecture**:
  - Implemented zero-dependency IndexedDB persistence layer (`ArtworkStore` in `ApexPrintHubDB`, store `artworks`) to store raw binary `File` objects across document navigation without server upload round-trips.
  - Added HTML5 Canvas downsampling engine (`createThumbnail`) that converts uploaded raster graphics into ultra-lightweight (~1KB) Base64 data URLs stored on `item.design.previewUrl` in `localStorage` without risking `QuotaExceededError`.
  - Added document badge fallback for vector and document artwork types (PDF, AI, PSD, EPS) displaying file extension and formatted byte size.
- **Drawer & Checkout Order Review UI**:
  - Upgraded cart drawer rendering in `script.js` to showcase high-res thumbnail previews or document badges for each custom item.
  - Designed and implemented luxury dark theme Order Request Review panel (`#checkoutOrderReview`) on `contact.html` rendering itemized cards, specifications, visual thumbnail previews, and deletion controls.
  - Dynamically adjusted file upload copy on `contact.html` to "Upload Additional Artwork / Master Files (Optional)" and added confirmation badge reminding customers that attached cart artwork will be bundled automatically.
  - Linked item removal in checkout review directly to IndexedDB deletion (`ArtworkStore.remove()`) and reactive DOM re-render.
- **Backend & Transactional Email Multi-File Pipeline**:
  - Updated `backend/routes/contact.js` from `upload.single('design_file')` to `upload.any()` with `multer`, collecting both `cart_artworks` multi-file attachments and optional single contact uploads.
  - Structured itemized specification summaries and parsed `cart_data` JSON payload.
  - Upgraded `notifyOwnerNewContact` and `confirmCustomerContact` in `backend/services/email.js` to attach all files in `mailOptions.attachments` and display an itemized list of attached artwork files with sizes in email templates.
- **Verification & Testing**:
  - Created automated Playwright verification suite (`scripts/test-artwork-flow.js`) that tests multi-item configuration, PNG thumbnail generation, PDF badge rendering, navigation to `contact.html`, visual preview persistence, form submission, and storage cleanup (IndexedDB & `localStorage` reset).
  - 100% test pass verified.
---

## Production Release — Cart Artwork Persistence, In-App Luxury Lightbox & Direct Cloud Streaming — 2026-09-06
- **Direct Client-to-Cloud Upload Pipeline (`window.uploadArtworkToSupabase`)**:
  - Implemented client-side direct streaming to Supabase Storage bucket (`order-artworks`) with sanitized timestamped paths (`orders/<timestamp>_<random>_<filename>`).
  - Added XHR progress tracking emitting continuous percentage events (0–100%) to drive live progress indicators.
  - Zero-breakage fallback architecture: when cloud credentials are unconfigured or when network anomalies occur, seamlessly defaults to local IndexedDB storage and canvas thumbnail generation without user disruption.
- **Luxury Upload Progress Bar & Modal Integration**:
  - Added luxury gold-gradient animated progress indicators (`.artwork-upload-progress-box`, `.artwork-progress-bar-track`, `.artwork-progress-bar-fill`) in the product customization modal.
  - Disabled submit button with live upload percentage readout during transfer (`Uploading Artwork (XX%)...`) to prevent premature submission.
  - Displays instant status transitions upon completion (`✓ Uploaded to cloud` or `✓ Attached locally for submission`).
- **Luxury In-App Artwork Lightbox Modal (`#artworkLightboxModal`)**:
  - Eliminated broken `blob:` tab navigation and Chromium `ERR_FILE_NOT_FOUND` errors by implementing an in-app glassmorphism modal on both `services.html` and `contact.html`.
  - Responsive header featuring format badges (PNG, PDF, AI, PSD), filename tooltip, interactive zoom engine (50% to 300% zoom with live percentage display), and accessible close buttons.
  - Dedicated media views: high-resolution raster image viewport with pan/zoom scaling, and vector document card with scalable SVG icon.
  - Full keyboard accessibility (Escape key dismiss) and backdrop click dismiss.
- **Interactive Checkout Review Panel & Per-Item Artwork Swap (`contact.html`)**:
  - Enhanced `#checkoutOrderReview` cards with per-item `.btn-checkout-swap` action buttons (`Change Artwork` / `+ Attach Artwork`).
  - Allows customers to replace or attach artwork directly on the checkout review screen without navigating back to the product catalog.
  - Reactively downsamples thumbnails, updates `localStorage`, persists binaries into `ArtworkStore`, cleans up orphaned files from IndexedDB, and updates the review DOM in real time.
- **Vercel Payload Optimization & Serverless Safety**:
  - Re-architected form submission to check for permanent cloud CDN URLs (`http://` or `https://`) in `item.design.url`.
  - For cloud-stored assets, passes the public URL inside `cart_data` JSON and bypasses binary multipart attachment, strictly complying with Vercel's 4.5MB serverless payload ceiling for large artwork files (up to 50MB).
  - For local fallback assets, safely retrieves binary `File` objects from `ArtworkStore` and appends to `cart_artworks`.
- **Enhanced Transactional Email Pipeline (`backend/services/email.js` & `backend/routes/contact.js`)**:
  - Contact route parses `cart_data` and synthesizes clean `[Cloud-Hosted Print Artwork (N)]` summaries with formatted MB sizes into order specifications.
  - Owner notification email injects luxury dark gold card section `☁️ Cloud-Hosted High-Resolution Print Artwork:` featuring itemized product tables and prominent gold one-click download action buttons (`Download File ↗`, `#C9A84C`).
  - Customer confirmation email reassuringly outlines prepress storage status (`🎨 Uploaded Production Artwork`) and provides direct proof download links.
- **Authoritative Automated Production Test Suite (`scripts/test-artwork-flow-production.js`)**:
  - 9-stage end-to-end automated Playwright verification suite testing the entire user journey: product modal upload, progress bar, PDF attachment, in-app lightbox, zero broken popup tabs, checkout review, per-item artwork swap, multipart form submission, post-submission storage purge, and backend email HTML generation.
  - 100% test pass verified with zero console errors.
---

## Phase 1 — Quote Email Delivery Resilience, Hero Copy & Product Modal Animation Fix — 2026-09-07
- **Quote & Contact Email Delivery Hardening (`backend/services/email.js`, `backend/routes/contact.js`, `backend/routes/quote.js`)**:
  - Refactored Nodemailer configuration with dynamic `getTransporter()` supporting custom domain SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`) and service-based SMTP (`EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS`).
  - Added simulated `jsonTransport` in test mode (`NODE_ENV === 'test'`) for deterministic integration testing.
  - Implemented 6-second timeout race on dual email notifications (store owner & customer).
  - Enforced strict owner notification verification (`quotes@apexprinthub.com`). If owner notification fails or credentials are unconfigured, endpoints return structured HTTP 500 (`EMAIL_DELIVERY_FAILED`) or 503 (`EMAIL_CREDENTIALS_MISSING`) rather than returning false-positive HTTP 200.
- **Hero Branding Copy (`index.html`)**:
  - Updated hero section typography to strictly read:
    ```html
    Bespoke<br>
    Print and Packaging<br>
    Studio
    ```
- **Product Opening Animation & Image Resolution (`index.html`, `services.html`, `style.css`, `script.js`)**:
  - Inserted native `<img id="modalMainImg">` into `.main-image-container` alongside `<canvas id="modalMainCanvas">`.
  - Updated `openProductModal` to display native `<img>` for raster products, eliminating canvas raster lag and anti-aliasing blur during CSS expansion.
  - Completely hides `.thumbnail-row` (`display: none`) for single-image catalog items or when `!pdfPath` or `totalPages <= 1`, eliminating duplicate single-thumbnail mosaic boxes.
  - Multi-page PDF thumbnail canvases now render at 140x110 (2x DPR), and main PDF pages render at 2.0 scale with `imageSmoothingQuality = 'high'`.
  - Added hardware acceleration (`transform: translate3d(0, 30px, 0); will-change: transform, opacity; backface-visibility: hidden;`) to `.modal-content` and fixed `.thumbnail` flex sizing to `flex: 0 0 70px; width: 70px; height: 55px;`.
- **Verification & Review Hardening**:
  - Verified via `tests/unit-email-contact.test.js` (5/5 passing), `tests/phase1-submission-pipeline.test.js` (10/10 passing), and `tests/email-delivery-failure.test.js` (4/4 passing).
  - Verified via Playwright automated tests on mobile (390x844) and desktop (1440x900) (`scripts/verify-fixes.js`).
  - Added SMTP credentials to Vercel production environment variables, deployed via Vercel CLI, and verified live production `POST /api/quote` and `POST /api/contact` returning HTTP 200 with `customerEmailSent: true` on `https://apex-printing-seven.vercel.app`.
  - Removed `-webkit-optimize-contrast` from CSS to eliminate nearest-neighbor pixelation, resolved PDF.js canvas double-render race condition, and cleaned up static dummy thumbnails.

---

## Phase 1 — 3D Product Carousel Selection Glitch Fix & Animated "Shop Now" Action Integration — 2026-09-07
- **Selection Flicker & Background Transition Smoothing (`script.js`, `style.css`)**:
  - Eliminated abrupt background/viewport jump upon product modal opening by refactoring `window.lockBodyScroll()` and `window.unlockBodyScroll()` to preserve standard document position flow (`document.body.style.position = ''`) with zero-layout-shift scrollbar compensation (`document.body.style.paddingRight = scrollbarWidth`).
  - Added smooth card centering interpolation (`relDiff` angular delta) on selection and halted carousel ambient drift during active modal sessions (`!isModalActive`).
  - Upgraded modal backdrop and dialog with hardware-accelerated transforms (`translate3d`, `scale(0.97)` to `scale(1)`), radial backdrop gradients, and cubic-bezier opacity easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Accurate 3D Hitbox & Hover Reliability (`script.js`, `style.css`)**:
  - Fixed raycast intercept misses by applying `pointer-events: none` to `#cylinderCarouselContainer` and `#cylinderCarouselTrack` while maintaining `pointer-events: auto` on `.cylinder-card`.
  - Dynamically cull pointer events for cards rotated to the backside of the cylinder (`absAngle < 65 && opacity > 0.15 ? 'auto' : 'none'`) preventing back-facing cards from capturing hover rays.
- **Luxury Animated "Shop Now" Action Buttons (`index.html`, `style.css`, `script.js`)**:
  - Integrated sleek pill-shaped "Shop Now" buttons (`.cylinder-card-btn`) with forward arrow SVGs across all 16 carousel cards.
  - Implemented luxury gold styling with angled sheen micro-animations (`::after` sweep on hover), dynamic gold gradient fill, and 20px gold glow.
  - Added robust pointer gesture disambiguation (`Math.hypot(dx, dy) > 7px`) ensuring drag/swipe motion glides freely without firing accidental modal opens.
- **Verification**:
  - 100% automated pass on comprehensive 6-stage test suite (`scripts/test-carousel-comprehensive.js`), regression modal test (`scripts/verify-fixes.js`), process section test (`scripts/verify-process-why-apex.js`), and end-to-end cart test (`scripts/test-artwork-flow.js`).

---

## Phase 1 — Transactional Email Sender Identity Configuration & Gmail SMTP Audit — 2026-09-08
- **Transactional Mailer Brand Sender Resolution (`backend/services/email.js`)**:
  - Implemented `resolveSenderAddress()`, strictly defaulting to `"Apex Print Hub" <quotes@apexprinthub.com>` while cleanly supporting `EMAIL_FROM_ADDRESS`, `EMAIL_FROM`, and `EMAIL_FROM_NAME` without nested angle brackets or quote corruptions.
  - Implemented `resolveReplyToAddress()` and `resolveOwnerEmail()` ensuring strict RFC 5322 compliance across customer receipts (`quotes@apexprinthub.com`) and owner notifications.
  - Exported address resolvers for granular unit testing and isolated test assertion.
- **Environment Variable & Relay Audit (`backend/.env`, `backend/.env.example`)**:
  - Added `EMAIL_FROM_ADDRESS="Apex Print Hub" <quotes@apexprinthub.com>` and `EMAIL_FROM_NAME="Apex Print Hub"` to local `.env` and production Vercel project environment variables.
  - Documented custom domain SMTP configuration (`mail.apexprinthub.com` on port 465/587) in `.env.example`.
  - Audited live IMAP sent headers on Gmail SMTP demonstrating the exact rewriting behavior in real-time.
- **Verification & Review Hardening (Review Round 2)**:
  - Hardened address parsing with `extractBareEmail()` and `extractDisplayName()`, eliminating unquoted display name bugs, outer-quote enclosing bugs, double-quote bugs, and invalid non-email fallbacks.
  - Protected HTML email templates against `mailto:` attribute syntax corruption by strictly normalizing Reply-To addresses to bare emails.
  - Corrected custom SMTP transporter port detection so port 587 defaults to `secure: false` (STARTTLS) and port 465 to `secure: true` (SSL).
  - Expanded `tests/sender-address-configuration.test.js` from 10 to 19 automated tests, including Nodemailer `addressparser` validation and HTML template safety checks.
  - All verification suites passing: `tests/sender-address-configuration.test.js` (19/19), `tests/unit-email-contact.test.js` (5/5), `tests/phase1-submission-pipeline.test.js` (10/10), `tests/email-delivery-failure.test.js` (4/4), `scripts/verify-phase1.js` (100% passing).

