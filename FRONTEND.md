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
