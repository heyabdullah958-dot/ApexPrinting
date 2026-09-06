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

## Lesson 5 — Chromium Top-Frame Blob/Data Navigation, Direct Cloud Streaming & Offline Resilience — 2026-09-06
- **Pattern**: Previewing user-uploaded artwork, managing multi-megabyte graphic files on serverless web architectures, and preventing browser navigation breakage.
- **Wrong assumptions made**:
  1. Assuming `window.open(blobUrl, '_blank')` or `<a href="blob:..." target="_blank">` is safe across page loads or when pointing to data URLs.
  2. Assuming heavy print artwork files (up to 50MB) can simply be uploaded in a single multipart POST payload through serverless API gateways like Vercel.
  3. Assuming that integrating cloud storage (Supabase) means local storage can be discarded or that cloud outages should block users from checking out.
- **What actually mattered**:
  1. **Top-Frame Navigation Security in Chromium**:
     Modern Chromium blocks top-frame navigation to `data:` URIs and revokes `blob:` URLs as soon as their originating document context is unloaded. Attempting to open them in a new tab triggers `ERR_FILE_NOT_FOUND` or silent security blocks. The reliable architectural pattern is to inspect media within an in-app lightbox modal (`#artworkLightboxModal`) that creates a temporary object URL from IndexedDB on-demand, binds it to an `<img>` element with CSS scale/zoom transforms, and revokes it immediately when the modal closes.
  2. **Direct Client-to-Cloud Uploads for Serverless Payload Protection**:
     Vercel and AWS Lambda strictly enforce body limits (4.5MB on Vercel). Submitting high-resolution customer artwork directly through the backend serverless route leads to HTTP 413 Payload Too Large errors. By uploading directly from the client's browser to Supabase Storage via XHR and transmitting only the permanent CDN URL string in the order JSON payload, serverless payload sizes remain tiny (<50KB) regardless of file size.
  3. **Zero-Breakage Graceful Fallback (Offline/Unconfigured Resilience)**:
     Production systems must never crash when external cloud storage services are slow, misconfigured, or offline. By wrapping client-to-cloud uploads with an automatic fallback to local IndexedDB (`ArtworkStore`), orders can still be constructed, saved, customized, and submitted without failure. On the backend, routes should dynamically inspect whether items contain cloud links or local multipart binaries, supporting both paths transparently.
- **Applies to**: `script.js`, `backend/routes/contact.js`, `backend/services/email.js`, file upload & storage architectures.
---

## Lesson 6 — Serverless Filesystem Boundaries & Defensive API Response Ingestion — 2026-09-06
- **Pattern**: Running Express API routes and multipart file handlers in serverless function environments (Vercel / AWS Lambda) and consuming responses on client web frontends.
- **Wrong assumptions made**:
  1. Assuming `multer({ dest: 'uploads/' })` or `fs.mkdirSync` is benign when defined at module load time.
  2. Assuming server endpoints always return JSON or that `response.ok` checks can precede `response.json()`.
  3. Assuming mobile clients won't upload raw high-resolution phone camera photos that exceed serverless gateway payload limits (4.5MB).
- **What actually mattered**:
  1. **Serverless Filesystems Are Strictly Read-Only**:
     In AWS Lambda / Vercel Serverless Functions, `/var/task` is completely immutable. Multer's default disk storage attempts to create directory paths like `uploads/` on the local disk at module import time, throwing `ENOENT` or `EROFS` synchronously. This crashes the serverless runtime during container cold start (`FUNCTION_INVOCATION_FAILED`) before any route handler can execute. Serverless endpoints must exclusively use `multer.memoryStorage()` (or `/tmp` if disk buffering is required).
  2. **Defensive Response Ingestion on Clients**:
     Serverless platforms and reverse proxies (Vercel, Cloudflare, AWS CloudFront) intercept fatal crashes, timeouts, and payload violations before they reach user code, returning raw plain text or HTML (e.g. "A server error has occurred", "504 Gateway Time-out", "413 Payload Too Large"). Calling `await response.json()` unconditionally guarantees an unhandled `SyntaxError: Unexpected token 'A' / '<'`. Frontend clients must always inspect `response.headers.get("content-type")`, safely fallback to `.text()`, and translate platform errors into user-friendly guidance.
  3. **Immediate Client-Side Boundary Enforcers**:
     Never rely solely on backend gateways to reject oversized payloads. Smartphone cameras produce multi-megabyte JPEGs (5–15MB). Client inputs must validate file size synchronously upon selection (`change` event), clearing the input and alerting the user before any network request is initiated.
- **Applies to**: `backend/routes/*.js`, `script.js`, any serverless backend routes and frontend form handlers.
---
