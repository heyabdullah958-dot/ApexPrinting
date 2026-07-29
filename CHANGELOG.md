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
- Replaced browser `alert()` popups with styled `window.showToast()` notifications.

