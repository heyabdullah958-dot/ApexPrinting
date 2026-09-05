# Technical Design Spec: Production-Ready Cart Artwork Persistence, In-App Lightbox & Multi-Item Ordering Flow

**Date**: 2026-09-06  
**Status**: Approved  
**Author**: Antigravity  
**Target Repository**: Apex Print Hub (`heyabdullah958-dot/ApexPrinting`)  

---

## 1. Problem Statement & User Experience Objectives

### 1.1 Context & Background
In the Apex Print Hub custom printing workflow, users configure bespoke products on `services.html` (e.g. Business Cards, Letterhead, Brochures) and optionally upload print-ready artwork files (PNG, JPG, PDF, AI, PSD).

In user testing and browser session recordings (`Recording 2026-09-05 193415.mp4`), three critical failure modes were identified:
1. **Broken Artwork Links in Cart Drawer**: Clicking the artwork link in the cart drawer opened a new browser tab to an expired/revoked `blob:` URL, triggering Chrome's `ERR_FILE_NOT_FOUND`.
2. **Missing Artwork Previews on Checkout (`contact.html`)**: When redirected via "Submit Order Request" from the drawer to `contact.html`, cart items were flattened into plain text inside a message textarea. No visual thumbnails or itemized artwork associations were displayed.
3. **Redundant Re-Upload & Multi-File Breakdown**: Users were forced to re-upload files using a single generic file input (`#design_file`), making it impossible to submit different artwork files for distinct items in a multi-item order.
4. **Serverless Payload Bottlenecks**: Directly POSTing multiple heavy print-ready files (e.g. three 5MB–20MB PDFs) to Vercel serverless endpoints exceeds Vercel's strict 4.5MB request payload limit, resulting in HTTP 413 errors.

### 1.2 Design Objectives
- **Permanent Cloud Hosting with Zero Payload Bottlenecks**: Implement direct client-to-Supabase Storage uploads that completely bypass Vercel serverless payload limits and generate permanent, accessible CDN URLs.
- **Resilient Offline/Local Fallback**: Maintain client-side IndexedDB binary caching and Base64 thumbnail generation so local testing and missing credentials never break the checkout experience.
- **Luxury In-App Artwork Lightbox Viewer**: Replace broken new-tab blob navigation with an in-app dark-themed modal that displays high-resolution previews, zoom controls, document badges, and safe download actions.
- **Interactive Checkout Review Panel**: Render itemized cards on `contact.html` displaying product specifications, visual thumbnails, and per-item "Change Artwork" controls.
- **Unified Multi-File Notification Pipeline**: Transmit all permanent CDN URLs and local fallback files to `/api/contact` and Nodemailer transactional emails (`quotes@apexprinthub.com`).

---

## 2. System Architecture & Component Design

```
+--------------------------------------------------------------------------------------------------+
|                                        BROWSER / CLIENT                                          |
|                                                                                                  |
|   [Product Modal (services.html)]                                                                |
|         |                                                                                        |
|         +---> 1. Canvas Downsampler -----> Generates lightweight ~160px Base64 Data URL         |
|         |                                                                                        |
|         +---> 2. Supabase Storage API ----> Direct upload to 'order-artworks' bucket            |
|         |     (Real-time Progress Bar)      (Returns permanent CDN URL)                          |
|         |                                                                                        |
|         +---> 3. IndexedDB Fallback Store -> Saves raw binary File in 'ApexPrintHubDB'           |
|                                                                                                  |
|   [Cart Drawer] & [Checkout Review (contact.html)]                                               |
|         |                                                                                        |
|         +---> In-App Lightbox Modal -----> Fullscreen preview, zoom, metadata, download          |
|         +---> Per-Item Artwork Swap -----> Replaces/attaches files directly on checkout          |
|                                                                                                  |
|   [Contact Form Submission]                                                                      |
|         |                                                                                        |
|         +---> FormData Payload ----------> cart_data (JSON with CDN URLs) + cart_artworks (Files)|
+--------------------------------------------------------------------------------------------------+
                                                   |
                                            POST /api/contact
                                                   |
                                                   v
+--------------------------------------------------------------------------------------------------+
|                                    BACKEND & CLOUD SERVICES                                      |
|                                                                                                  |
|   [Express Server (/api/contact)]                                                                |
|         |                                                                                        |
|         +---> multer.any() --------------> Collects fallback & additional binaries              |
|         +---> Supabase DB ---------------> Logs submission with permanent asset URLs            |
|         +---> Nodemailer Service ---------> Dual-recipient email dispatch                        |
|                     |                                                                            |
|                     +---> Owner Notification (quotes@apexprinthub.com): Clickable CDN buttons    |
|                     +---> Customer Confirmation: Branded luxury order summary & proof details   |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1 Direct Client-to-Supabase Storage Pipeline (`script.js`)
- **Bucket**: `order-artworks`
- **Target Endpoint**: `https://<supabase-url>/storage/v1/object/order-artworks/<path>`
- **Upload Path Convention**: `orders/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${sanitizedFilename}`
- **Progress Tracking**:
  - Employs `XMLHttpRequest` or `fetch` with readable stream progress reporting to drive a gold-accented progress bar (`#modalUploadProgress`).
  - Button state: Disables "Add to Order Request" and displays "Uploading Artwork (XX%)..." until the transfer completes.
- **Metadata Output**:
  ```javascript
  item.design = {
    id: "art_1725570000_abc12",
    name: "brochure_cover.pdf",
    size: 2450000,
    type: "application/pdf",
    url: "https://your-project.supabase.co/storage/v1/object/public/order-artworks/orders/1725570000_abc12_brochure_cover.pdf",
    previewUrl: "data:image/jpeg;base64,...", // Canvas downsampled thumbnail
    storage: "supabase" // or 'indexeddb'
  };
  ```
- **Resilient Fallback**: If Supabase configuration keys are missing or invalid, upload automatically falls back to local IndexedDB storage (`ArtworkStore.save(id, file)`) and updates the progress indicator to: `✓ Attached locally for submission`.

### 3.2 Luxury In-App Artwork Lightbox Modal (`contact.html`, `services.html`, `style.css`, `script.js`)
- **DOM Container**: `<div id="artworkLightboxModal" class="artwork-lightbox-backdrop">...</div>`
- **Trigger**: Bound to thumbnail images, document badges, and file titles across both the cart drawer and `#checkoutOrderReview`.
- **Content Rendering**:
  - **Raster Images (`image/*`)**: Rendered in a high-res image container with interactive zoom controls (`+`, `-`, `Reset`) and responsive centering.
  - **Documents (`PDF`, `AI`, `PSD`, `EPS`)**: Rendered with a high-contrast luxury document card displaying format badges, file size in megabytes, and an embedded iframe/canvas viewer where supported.
  - **Metadata Card**: Displays file name, mime type, byte size, and storage status tag (`Cloud Hosted` or `Local Attached`).
  - **Action Toolbar**:
    - **Open Full File ↗**: Direct link to the permanent Supabase CDN URL (or safe `URL.createObjectURL` for local files).
    - **Download ⬇**: Downloads the asset to the user's computer.
    - **Close ✕**: Dismisses the modal and cleans up transient object URLs.

### 3.3 Cart Drawer & Checkout Review Interface (`script.js`, `style.css`)
- **Cart Drawer (`renderCartItems`)**:
  - 72px $\times$ 72px thumbnail preview box with gold border accent (`rgba(201, 168, 76, 0.3)`).
  - Clean typographic metadata layout: item options, file name, formatted size (`1.4 MB`), and cloud status tag.
  - Interactive click listener opening the In-App Lightbox instead of a broken new-tab blob URL.
- **Checkout Review Panel (`#checkoutOrderReview`) on `contact.html`**:
  - Displays comprehensive item cards with title, quantity badge, option tags, and artwork preview.
  - **Per-Item Artwork Swap / Attachment**: Adds an action button (`Change Artwork` / `Attach Artwork`) on each card triggering a hidden per-item file input. Selecting a new file re-runs the upload pipeline, updates the thumbnail, and synchronizes the cart.
  - **Form Upload Streamlining**: Automatically updates the generic file input label to *"Upload Additional Artwork / Master Files (Optional)"* and displays a reassuring green confirmation badge: *"✓ Item artwork listed above is already attached to this order request."*

### 3.4 Multi-File Submission & Transactional Mailer Pipeline
- **Contact Form Submission (`#contactForm` listener)**:
  - Formats cart contents into structured JSON (`cart_data`), embedding all permanent CDN URLs.
  - Checks for any fallback files stored locally in `ArtworkStore` (IndexedDB) and appends their raw binaries under `cart_artworks` in `FormData`.
  - Appends optional standalone files from `#design_file`.
  - Formats specification text into `message`.
  - Posts to `/api/contact`.
  - On HTTP 200: Clears `cart = []`, purges `ArtworkStore.clear()`, and transitions to `#formSuccess`.
- **Backend Route (`backend/routes/contact.js`)**:
  - Uses `multer.any()` to process incoming multi-file uploads.
  - Parses `cart_data` to extract all item specifications and permanent cloud asset URLs.
  - Inserts the submission into the Supabase database.
  - Dispatches dual emails asynchronously via `Promise.allSettled()`.
- **Email Service (`backend/services/email.js`)**:
  - **Store Owner Notification (`quotes@apexprinthub.com`)**: Displays an order breakdown table with prominent gold "Download Artwork" buttons linking directly to permanent CDN URLs. Directly attaches any fallback binaries via `mailOptions.attachments`.
  - **Customer Confirmation**: Branded order receipt confirming the request, listing attached design assets, and enforcing `From: "Apex Print Hub" <quotes@apexprinthub.com>` and `Reply-To: quotes@apexprinthub.com`.

---

## 4. Error Handling & Edge Case Strategy

| Scenario | Risk | Mitigation |
| :--- | :--- | :--- |
| **Vercel Serverless 4.5MB Payload Limit** | HTTP 413 Payload Too Large when submitting large print files | Direct browser upload to Supabase Storage bucket (`order-artworks`) bypasses serverless functions entirely. |
| **Missing / Placeholder Supabase Credentials** | Client upload errors in local dev or unconfigured deployments | Automated feature-detection flags `cloudAvailable = false` and routes files into client IndexedDB with zero user disruption. |
| **Volatile Blob URLs in New Tabs** | Chrome `ERR_FILE_NOT_FOUND` on navigation / tab open | Deprecate raw blob new tabs; replace with In-App Lightbox Modal and permanent Supabase CDN links. |
| **LocalStorage 5MB Quota** | `QuotaExceededError` when storing artwork strings | Store only downsampled ~160px Base64 thumbnails (~1–5KB) in `localStorage`; store raw binaries in IndexedDB. |
| **Customer Abandons Order After Upload** | Orphaned files in cloud storage | Uploads are isolated in the `orders/` bucket prefix. Storage lifecycle rules can safely prune unreferenced assets after 30 days. |
| **Mobile & Responsive Viewports** | Review cards or lightbox overflow on small mobile screens | CSS flex-wrap layout shifts thumbnails above text; touch-friendly 44px+ tap targets; responsive lightbox max-width 92vw. |

---

## 5. Verification & Testing Plan

### 5.1 Automated Playwright Test Suite (`scripts/test-artwork-flow-production.js`)
1. **Catalog Upload & Progress Bar**:
   - Navigate to `services.html`.
   - Open modal for "Luxury Business Cards", select a valid PNG file.
   - Assert progress indicator displays and completes.
   - Assert `localStorage.apex_cart` contains item with `previewUrl` data URL and valid `url`.
2. **Document Badge & Cart Drawer**:
   - Open modal for "Brochures", attach a valid PDF file.
   - Open cart drawer via `window.openCartModal()`.
   - Assert 2 items are present with distinct thumbnails (image thumbnail and PDF badge).
3. **In-App Lightbox Verification**:
   - Click Item 1 artwork in drawer $\rightarrow$ assert `#artworkLightboxModal` appears, displays image, zoom controls, and metadata.
   - Assert zero console errors and zero broken browser tabs.
   - Click modal close $\rightarrow$ assert lightbox dismisses cleanly.
4. **Checkout Transition & Review Panel**:
   - Click "Submit Order Request" $\rightarrow$ assert navigation to `contact.html?service=Custom%20Order&checkout=1`.
   - Assert `#checkoutOrderReview` is visible with 2 cards.
   - Assert Item 1 displays image thumbnail; Item 2 displays PDF badge.
   - Assert `#designFileLabel` contains "Additional Artwork" and `#designFileHint` is visible.
5. **Per-Item Artwork Replacement**:
   - Trigger artwork change on Item 2 using a replacement file.
   - Assert thumbnail and metadata update reactively.
6. **Form Submission & Cleanup**:
   - Fill contact form inputs and submit.
   - Assert `/api/contact` returns HTTP 200 with `success: true`.
   - Assert `cart` is empty array in `localStorage` and `ArtworkStore` is purged in IndexedDB.
   - Assert `#formSuccess` confirmation is visible.
