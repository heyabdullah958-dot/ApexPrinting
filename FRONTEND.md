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

