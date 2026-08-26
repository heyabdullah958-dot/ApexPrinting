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
  - Enhanced Supabase error handling to prevent unhandled database exceptions from blocking HTTP responses.
  - Cleaned up validation rules in `backend/middleware/validate.js` to decouple obsolete payment method checks.
