# LESSONS.md
## Auto-generated — 2026-08-26
### Detected from codebase scan

This log tracks generalized patterns, wrong assumptions, and root causes across sessions to prevent repeated errors.

---

## Lesson 1 — Form Handlers & Inline Script Audit — 2026-08-26
- **Pattern**: Modifying frontend submit workflows in multi-page vanilla HTML/JS applications.
- **Wrong assumption made**: Assuming that form submissions are only controlled by the main global `script.js` bundle.
- **Applies to**: `*.html`, `script.js`, any frontend form integrations.

---

## Lesson 2 — CSS 3D Perspective Projection & Cylinder Fore-shortening — 2026-08-26
- **Pattern**: Constructing 3D cylinder carousels using pure CSS3 transforms (`rotateY` + `translateZ`).
- **Wrong assumption made**: Assuming that card height in 2D pixels (`height: 310px`) dictates its vertical footprint on screen regardless of perspective.
- **What actually mattered**: With CSS `perspective: D` and card position at `translateZ(Z)`, the front-most card is magnified by scale factor $S = \frac{D}{D - Z}$. If $D=1400$ and $Z=606$, magnification is $1.76\times$ ($545\text{px}$ visual height), causing downward bleed into adjacent sections. Raising $D$ to $2000\text{px}$ stabilizes the scale to $1.4\times$ and ensures clean vertical separation without distortion.
- **Applies to**: `style.css`, `script.js`, any 3D carousel / card slider implementations.

---

## Lesson 3 — Phone Dial Code Sync & Transactional SMTP Reply-To Routing — 2026-09-05
- **Pattern**: Synchronizing country selection with phone inputs and configuring brand-authenticated transactional mailers.
- **Wrong assumption made**: Assuming that simply changing placeholder text or setting an unlinked value is sufficient for phone country sync, and assuming SMTP transport authentication automatically handles user replies.
- **What actually mattered**: 
  1. Phone input synchronization must use regex subscriber extraction (`/^(?:\+?\d{1,4}|00\d{1,4})?[\s\-\.]*(?:0)?(.*)$/`) to swap dial code prefixes while strictly preserving valid user-typed numbers and stripping national leading zeros.
  2. In transactional email services where SMTP transport user differs from customer-facing business addresses, RFC 5322 `replyTo` must be explicitly declared (`replyTo: quotes@apexprinthub.com` for client confirmations, `replyTo: data.email` for admin notifications) to guarantee replies route to the intended mailbox.
## Lesson 4 — Client-Side Binary File Persistence Across Multi-Page Flows — 2026-09-05
- **Pattern**: Allowing users to upload custom files on one page (e.g. catalog/customizer) and submitting them together on a final form (e.g. checkout/contact) in a multi-page vanilla web architecture without a single-page app (SPA) router.
- **Wrong assumption made**: Assuming that temporary object URLs (`URL.createObjectURL(file)`) or full file Base64 serialization into `localStorage` can bridge multi-page document navigation.
- **What actually mattered**:
  1. `URL.createObjectURL` is scoped to the origin document environment and is immediately revoked/garbage-collected upon document unload or navigation (`window.location.href`).
  2. `localStorage` cannot hold raw `File`/`Blob` objects and has a stringent 5MB string quota per domain. Storing full-resolution artwork as Base64 strings immediately triggers `QuotaExceededError`.
  3. The optimal solution is a hybrid persistence pattern:
     - **Binary Storage**: Store raw `File` objects asynchronously in client IndexedDB (`ApexPrintHubDB`).
     - **Visual Representation**: Downsample raster graphics via an HTML5 canvas to ultra-lightweight (~1KB) Base64 data URLs stored on `item.design.previewUrl` in `localStorage`. This allows instant, synchronous thumbnail rendering on any page without async delays.
     - **Atomic Submission**: When submitting the final checkout request, retrieve raw `File` objects from IndexedDB and bundle them directly into `FormData` under `cart_artworks`, alongside any standalone file inputs, then cleanly purge the client store upon server receipt.
- **Applies to**: `script.js`, `contact.html`, `backend/routes/contact.js`, multi-file upload & cart architectures.
---


