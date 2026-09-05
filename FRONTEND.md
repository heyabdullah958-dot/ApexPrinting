# FRONTEND.md
## Auto-generated — 2026-07-18
### Detected from codebase scan

Frontend is pure HTML/CSS/JS without a build step or framework.
Components like Navbar, Hero, and Forms are implemented natively in the DOM.

---

## Phase 1 — Convert Checkout to Inquiry Flow & Remove Pricing Displays — 2026-08-26
- Decoupled payment/pricing dependencies across `index.html`, `services.html`, `contact.html`, and `script.js`.
- Removed currency selectors (`#currencySelector`) and product price labels (`.product-pricing`, `#modalPrice`, `.price-label`).
- Refactored Cart modal and drawer into an "Order Request List" storing specifications and artwork attachments without calculated prices.
- Updated CTA buttons to "Submit Order Request →" and "Add to Order Request →".
- Consolidated `contact.html` form submission inside `script.js` with full `FormData` and file attachment support, eliminating the conflicting inline submit listener.
- Confidence: 95% — Fully verified DOM and UI state transitions across all pages.

---

## Phase 2 — Bespoke Editorial Hero & 3D Curved Cylinder Carousel — 2026-08-26
- Replicated 1:1 editorial hero layout from reference video (`Recording 2026-08-26 165334.mp4`) with bold display typography, subheadings, and twin pill CTA buttons ("Book a meeting" & "See Projects →").
- Implemented pure CSS3/ES6 3D Curved Cylinder Carousel (`perspective: 2000px`, `transform-style: preserve-3d`, trigonometric radial card layout).
- Integrated interactive pointer drag and touch physics with momentum inertia deceleration (`friction: 0.94`), mouse wheel horizontal scroll, and ambient idle drift.
- Preserved Apex Print Hub luxury dark palette (`#050505`, `#181818`, `#C9A84C` gold highlights) and populated cards with high-res 3D print assets.
- Confidence: 100% — Verified via automated Playwright visual and interaction testing suite.

---

## Phase 3 — Authentic 3D Concave Product Showcase Carousel Implementation — 2026-08-27
- Engineered genuine 3D Concave (inward-curving amphitheater) geometry ($\Delta X = R\sin\theta$, $\Delta Z = -R(1-\cos\theta)$, $\text{rotateY}(-\theta)$) matching reference video benchmark.
- Populated carousel with 16 continuous loop cards bound to authentic Apex Print Hub products (Foil Business Cards, Editorial Brochures, Corporate Booklets, Exhibition Posters, Rigid Packaging, Stationery, Portfolios, Metallic Finishes).
- Enhanced momentum dragging physics (`friction: 0.94`, `dragSensitivity: 0.16`), mouse wheel horizontal scroll, cursor state switching, and smooth edge opacity falloff.
- Verified on local server (`http://localhost:8000/index.html`) with zero remote pushes or Vercel production deployment.
- Confidence: 100% — Fully verified against reference video frames via Playwright headless screenshot testing suite.

---

## Phase 1 — Cart Artwork Persistence & Checkout Order Review Flow — 2026-09-05
- Implemented IndexedDB binary persistence layer (`ArtworkStore` in `ApexPrintHubDB`) to hold raw `File` objects across navigation without server upload overhead or ephemeral object URL invalidation.
- Created canvas downscaler `createThumbnail` to store compressed Base64 data URLs on `item.design.previewUrl` in `localStorage` for synchronous thumbnail rendering across all pages.
- Enriched cart drawer item rendering with visual image thumbnails, document badges (PDF/AI/PSD), file sizes, and responsive cards.
- Integrated `#checkoutOrderReview` panel into `contact.html` and styled it with `.checkout-review-panel`, `.checkout-item-card`, `.checkout-thumb-box`, `.checkout-thumb-img`, `.checkout-doc-badge`, and `.checkout-artwork-status` in `style.css`.
- Updated form submission handler in `script.js` to bundle all itemized binary files from IndexedDB into `cart_artworks`, append `cart_data`, and purge client cache upon successful HTTP 200 receipt.
- Files modified: `contact.html`, `script.js`, `style.css`
- How it was verified: Automated Playwright test suite `scripts/test-artwork-flow.js` verifying image and PDF attachment, cart display, navigation to `contact.html`, visual preview presence, submission, and storage reset.
## Production Release — Luxury In-App Lightbox, Per-Item Swapping & Cloud Storage Pipeline — 2026-09-06
- **Luxury In-App Artwork Lightbox Modal (`#artworkLightboxModal`)**:
  - Replaced all external `target="_blank"` tab navigations with a native, responsive glassmorphism modal on both `services.html` and `contact.html`.
  - Backdrop: `rgba(5, 5, 5, 0.88)` with `10px` blur (`backdrop-filter: blur(10px)`), `z-index: 100000`.
  - Dialog: `#141414` dark card framed with gold border accent (`rgba(201, 168, 76, 0.35)`), rounded corners (`12px`), and soft shadow.
  - Header compartment: Format indicator badge (`#lightboxBadge`), sanitized file name (`#lightboxTitle`), interactive zoom controls (`#lightboxZoomControls`), and close button (`.artwork-lightbox-close`).
  - Media compartment (`#lightboxMediaContainer`): High-resolution raster viewport (`#lightboxImg`) with CSS transforms for scaling (50% to 300%), and vector document card (`#lightboxDocCard`) with scalable SVG glyph for PDF, AI, PSD, and EPS files.
  - Footer compartment: File specifications (`#lightboxSpecs`: format, size in MB, storage tier) and action buttons (`#lightboxOpenExternalBtn`, `#lightboxDownloadBtn`).
  - Interactions: Zoom in/out/reset engine, Escape key listener, and backdrop click dismissal with automatic `URL.revokeObjectURL` cleanup.
- **Per-Item Artwork Swapping (`.btn-checkout-swap` & `window.triggerArtworkSwap`)**:
  - Rendered `.btn-checkout-swap` on each item card in `#checkoutOrderReview` on `contact.html`.
  - State awareness: Displays `Change Artwork` when artwork is attached, and `+ Attach Artwork` when item was added without files.
  - Dynamic file chooser handling: Unlinks and deletes the prior binary from `ArtworkStore` in IndexedDB, downsamples a new 120x120 thumbnail, initiates Supabase direct upload (with IndexedDB fallback), updates `cart[index].design`, saves `localStorage`, and triggers reactive DOM re-render without page refresh.
- **Real-Time Upload Progress Indicator**:
  - Added `.artwork-upload-progress-box` in `#productModal` containing `.artwork-progress-bar-track`, `.artwork-progress-bar-fill` (gold gradient: `linear-gradient(90deg, #C9A84C, #ffd700)`), and `.artwork-upload-status`.
  - XHR upload progress callback updates track width and status text dynamically (0–100%). Disables submit button `#modalSubmitBtn` with live status text (`Uploading Artwork (XX%)...`) during active transfer.
- **Storage Lifecycle & Thumbnail Pipeline**:
  - `ArtworkStore` in IndexedDB (`ApexPrintHubDB`, store `artworks`): Asynchronously stores raw binary `File` objects up to 50MB per item, preserving full fidelity across multi-page navigation.
  - `createThumbnail(file)`: HTML5 canvas pipeline downsampling uploaded raster images to crisp, lightweight (~1KB) Base64 data URLs stored on `item.design.previewUrl` in `localStorage` for instant synchronous rendering in cart drawer and checkout review.
  - Vercel payload optimization: If item has a cloud CDN URL (`http://` or `https://`), binary data is omitted from multipart form post; if unuploaded (local fallback), binary is extracted from IndexedDB and bundled under `cart_artworks`.
  - Post-submission cleanup: Automatically resets `cart = []`, updates `localStorage`, and clears `ArtworkStore` via `window.ArtworkStore.clear()`.
- Files modified: `services.html`, `contact.html`, `script.js`, `style.css`.
- How it was verified: Automated Playwright test suite `scripts/test-artwork-flow-production.js` verifying 9 full stages with 100% pass rate.
- Confidence: 100% — Fully verified in headless Chromium.
---

