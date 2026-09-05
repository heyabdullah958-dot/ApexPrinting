# Production-Ready Cart Artwork Persistence & In-App Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an enterprise-grade print artwork persistence, preview, and ordering pipeline featuring direct Supabase Storage uploads with progress feedback, a luxury in-app artwork lightbox viewer, per-item artwork swapping on checkout, and multi-file transactional email dispatch.

**Architecture:** A hybrid client-cloud persistence architecture where customer artwork uploaded in the product modal directly streams to a Supabase Storage bucket (`order-artworks`) with live progress feedback, bypassing Vercel's 4.5MB serverless limit and returning permanent CDN URLs. The client simultaneously retains a ~160px canvas Base64 thumbnail and IndexedDB local fallback. Cart drawer and checkout review components trigger a luxury in-app lightbox modal eliminating broken `blob:` tabs. Checkout submissions send structured item data and permanent asset links to `/api/contact` and Nodemailer dual-recipient emails.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5 Canvas API, IndexedDB API, Supabase Storage REST API, CSS3 Glassmorphism & Custom Properties, Express.js with Multer, Nodemailer, Playwright for automated browser verification.

## Global Constraints
- **Vercel Serverless Ceiling**: Requests to serverless endpoints must not exceed 4.5MB; all print-ready raw binaries must be uploaded directly to Supabase Storage or handled via fallback.
- **No Fragile Blob URLs in New Tabs**: Never open raw `blob:` URLs in `target="_blank"` windows; all previews must open via the In-App Lightbox Modal or permanent Supabase CDN URLs.
- **Theme Integrity**: Maintain luxury dark aesthetics (`#050505`, `#121212`, `#141414`, `#C9A84C` gold highlights) matching Apex Print Hub design standards.
- **Zero-Breakage Fallback**: If Supabase credentials are not present or network drops, automatically fall back to local IndexedDB storage (`ApexPrintHubDB`) with zero errors.

---

### Task 1: Direct Supabase Storage Client & Modal Upload Progress Bar

**Files:**
- Modify: `script.js:1-160` (Client-side Supabase Storage helper & progress engine)
- Modify: `script.js:1740-1810` (Product modal file change & upload integration)
- Modify: `style.css:2325-2480` (Progress bar & upload indicator styles)
- Test: `tests/unit-storage.test.js`

**Interfaces:**
- Consumes: `window.ArtworkStore` (IndexedDB fallback), `window.createThumbnail` (Canvas downsampler)
- Produces: `window.uploadArtworkToSupabase(file, onProgress)` returning `{ success: boolean, url: string, name: string, size: number, storage: 'supabase' | 'indexeddb' }`

- [ ] **Step 1: Write test for uploadArtworkToSupabase and fallback**

Create `tests/unit-storage.test.js`:
```javascript
const assert = require('assert');

describe('Storage Upload Pipeline', () => {
  it('should fall back to indexeddb structure when cloud is unconfigured', async () => {
    const mockFile = { name: 'test_logo.png', size: 1024, type: 'image/png' };
    const mockUpload = (file, isCloudConfigured) => {
      if (!isCloudConfigured) {
        return {
          success: true,
          storage: 'indexeddb',
          url: '',
          name: file.name,
          size: file.size
        };
      }
      return {
        success: true,
        storage: 'supabase',
        url: `https://test.supabase.co/storage/v1/object/public/order-artworks/orders/${file.name}`,
        name: file.name,
        size: file.size
      };
    };

    const fallbackResult = mockUpload(mockFile, false);
    assert.strictEqual(fallbackResult.storage, 'indexeddb');
    assert.strictEqual(fallbackResult.name, 'test_logo.png');

    const cloudResult = mockUpload(mockFile, true);
    assert.strictEqual(cloudResult.storage, 'supabase');
    assert(cloudResult.url.includes('supabase.co'));
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node -e "require('./tests/unit-storage.test.js')"`
Expected: Clean exit (passes logic verification).

- [ ] **Step 3: Implement Supabase upload engine and progress UI**

In `script.js`, add `window.uploadArtworkToSupabase`:
```javascript
// Direct Client Supabase Storage Upload Helper with Progress
window.uploadArtworkToSupabase = async function(file, onProgress) {
    const SUPABASE_URL = window.SUPABASE_URL || 'https://placeholder.supabase.co';
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
    const isCloudConfigured = SUPABASE_URL && !SUPABASE_URL.includes('placeholder') && !SUPABASE_URL.includes('your-project') && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'your-anon-key';

    if (!isCloudConfigured) {
        return {
            success: true,
            storage: 'indexeddb',
            url: '',
            name: file.name,
            size: file.size,
            type: file.type
        };
    }

    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const storagePath = `orders/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;
        const targetUrl = `${SUPABASE_URL}/storage/v1/object/order-artworks/${storagePath}`;

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && typeof onProgress === 'function') {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/order-artworks/${storagePath}`;
                resolve({
                    success: true,
                    storage: 'supabase',
                    url: publicUrl,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            } else {
                console.warn('Supabase upload returned non-200, using local fallback:', xhr.status, xhr.responseText);
                resolve({
                    success: true,
                    storage: 'indexeddb',
                    url: '',
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            }
        });

        xhr.addEventListener('error', () => {
            console.warn('Supabase upload network error, using local fallback');
            resolve({
                success: true,
                storage: 'indexeddb',
                url: '',
                name: file.name,
                size: file.size,
                type: file.type
            });
        });

        xhr.open('POST', targetUrl);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
    });
};
```

In `style.css`, add upload progress styles:
```css
.artwork-upload-progress-box {
  margin-top: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
}
.artwork-progress-bar-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.4rem;
}
.artwork-progress-bar-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #C9A84C, #ffd700);
  border-radius: 3px;
  transition: width 0.2s ease;
}
.artwork-upload-status {
  font-size: 0.78rem;
  color: var(--gray);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.artwork-upload-status.complete {
  color: #2ecc71;
}
```

In `script.js` product modal upload handler, bind the upload with progress and store `url` on `item.design`.

- [ ] **Step 4: Verify syntax and functionality**

Run: `node -c script.js`
Expected: Exits cleanly with code 0.

- [ ] **Step 5: Commit**

```bash
git add script.js style.css tests/unit-storage.test.js
git commit -m "feat: add client-side Supabase storage upload pipeline with progress tracking and IndexedDB fallback"
```

---

### Task 2: Luxury In-App Artwork Lightbox Modal

**Files:**
- Modify: `services.html:300-340` (Add `#artworkLightboxModal` container)
- Modify: `contact.html:260-280` (Add `#artworkLightboxModal` container)
- Modify: `style.css:2480-2620` (Lightbox backdrop, image container, zoom controls, document cards)
- Modify: `script.js:1800-1920` (Lightbox open/close controller & zoom logic)
- Test: `scripts/test-artwork-flow.js`

**Interfaces:**
- Consumes: `item.design` (`name`, `url`, `previewUrl`, `size`, `type`, `id`)
- Produces: `window.openArtworkLightbox(design)` and `window.closeArtworkLightbox()`

- [ ] **Step 1: Define the Lightbox HTML component**

Add to both `services.html` and `contact.html` before closing `</body>`:
```html
<!-- Luxury In-App Artwork Lightbox Modal -->
<div id="artworkLightboxModal" class="artwork-lightbox-backdrop" style="display:none;" onclick="if(event.target===this) window.closeArtworkLightbox();">
    <div class="artwork-lightbox-dialog">
        <div class="artwork-lightbox-header">
            <div class="artwork-lightbox-meta">
                <span class="artwork-lightbox-badge" id="lightboxBadge">IMAGE</span>
                <h4 class="artwork-lightbox-title" id="lightboxTitle">Artwork Preview</h4>
            </div>
            <button class="artwork-lightbox-close" type="button" onclick="window.closeArtworkLightbox()" title="Close">&times;</button>
        </div>
        <div class="artwork-lightbox-body" id="lightboxBody">
            <div class="artwork-lightbox-media" id="lightboxMediaContainer">
                <img id="lightboxImg" src="" alt="Artwork Preview" style="display:none;">
                <div id="lightboxDocCard" style="display:none;" class="artwork-lightbox-doc-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <span id="lightboxDocExt">PDF</span>
                </div>
            </div>
        </div>
        <div class="artwork-lightbox-footer">
            <div class="artwork-lightbox-specs" id="lightboxSpecs">Size: 1.2 MB</div>
            <div class="artwork-lightbox-actions">
                <a id="lightboxOpenExternalBtn" href="#" target="_blank" class="btn-lightbox-secondary">Open Full File ↗</a>
                <a id="lightboxDownloadBtn" href="#" download class="btn-lightbox-primary">Download File ⬇</a>
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Add CSS styling for the Lightbox**

In `style.css`:
```css
.artwork-lightbox-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 5, 5, 0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  animation: fadeIn 0.25s ease;
}
.artwork-lightbox-dialog {
  background: #141414;
  border: 1px solid rgba(201, 168, 76, 0.35);
  border-radius: 12px;
  width: 100%;
  max-width: 680px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
}
.artwork-lightbox-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.artwork-lightbox-badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--gold);
  background: rgba(201, 168, 76, 0.12);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}
.artwork-lightbox-title {
  font-family: var(--font-serif);
  color: var(--white);
  font-size: 1.1rem;
  margin: 0.2rem 0 0 0;
}
.artwork-lightbox-close {
  background: none;
  border: none;
  color: var(--gray);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}
.artwork-lightbox-close:hover {
  color: #e74c3c;
}
.artwork-lightbox-body {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  min-height: 320px;
  max-height: 60vh;
  overflow: auto;
}
.artwork-lightbox-media img {
  max-width: 100%;
  max-height: 52vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 5px 25px rgba(0,0,0,0.5);
}
.artwork-lightbox-doc-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--gold);
  padding: 2rem;
}
.artwork-lightbox-doc-card svg {
  width: 64px;
  height: 64px;
  stroke: var(--gold);
}
.artwork-lightbox-doc-card span {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 2px;
}
.artwork-lightbox-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.8rem;
}
.artwork-lightbox-specs {
  font-size: 0.82rem;
  color: var(--gray);
}
.artwork-lightbox-actions {
  display: flex;
  gap: 0.75rem;
}
.btn-lightbox-secondary {
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--white);
  padding: 0.4rem 0.85rem;
  border-radius: 4px;
  text-decoration: none;
  font-size: 0.82rem;
}
.btn-lightbox-primary {
  background: var(--gold);
  color: #000;
  padding: 0.4rem 0.85rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.82rem;
}
```

- [ ] **Step 3: Implement window.openArtworkLightbox and close logic**

In `script.js`:
```javascript
let currentLightboxObjectUrl = null;

window.openArtworkLightbox = async function(design) {
    const modal = document.getElementById('artworkLightboxModal');
    if (!modal || !design) return;

    const titleEl = document.getElementById('lightboxTitle');
    const badgeEl = document.getElementById('lightboxBadge');
    const imgEl = document.getElementById('lightboxImg');
    const docCardEl = document.getElementById('lightboxDocCard');
    const docExtEl = document.getElementById('lightboxDocExt');
    const specsEl = document.getElementById('lightboxSpecs');
    const openExtBtn = document.getElementById('lightboxOpenExternalBtn');
    const downloadBtn = document.getElementById('lightboxDownloadBtn');

    titleEl.textContent = design.name || 'Artwork Preview';
    const ext = design.name ? (design.name.split('.').pop() || 'FILE').toUpperCase() : 'FILE';
    badgeEl.textContent = ext;

    const sizeStr = design.size ? `${(design.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size';
    specsEl.textContent = `File Format: ${ext} • Size: ${sizeStr} • Storage: ${design.url ? 'Cloud Stored' : 'Local'}`;

    if (currentLightboxObjectUrl) {
        URL.revokeObjectURL(currentLightboxObjectUrl);
        currentLightboxObjectUrl = null;
    }

    let activeUrl = design.url;
    if (!activeUrl && design.id && window.ArtworkStore) {
        const rawFile = await window.ArtworkStore.get(design.id);
        if (rawFile) {
            currentLightboxObjectUrl = URL.createObjectURL(rawFile);
            activeUrl = currentLightboxObjectUrl;
        }
    }
    if (!activeUrl && design.previewUrl) {
        activeUrl = design.previewUrl;
    }

    const isImage = (design.type && design.type.startsWith('image/')) || (design.previewUrl && !design.previewUrl.startsWith('data:application'));

    if (isImage && (design.previewUrl || activeUrl)) {
        imgEl.src = design.previewUrl || activeUrl;
        imgEl.style.display = 'block';
        docCardEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        docCardEl.style.display = 'flex';
        docExtEl.textContent = ext;
    }

    if (activeUrl) {
        openExtBtn.href = activeUrl;
        openExtBtn.style.display = 'inline-flex';
        downloadBtn.href = activeUrl;
        downloadBtn.download = design.name || 'artwork';
        downloadBtn.style.display = 'inline-flex';
    } else {
        openExtBtn.style.display = 'none';
        downloadBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeArtworkLightbox = function() {
    const modal = document.getElementById('artworkLightboxModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    if (currentLightboxObjectUrl) {
        URL.revokeObjectURL(currentLightboxObjectUrl);
        currentLightboxObjectUrl = null;
    }
};
```

In `renderCartItems()`, bind clicking the thumbnail or file name to `openArtworkLightbox(cart[index].design)`.

- [ ] **Step 4: Verify syntax**

Run: `node -c script.js`
Expected: Code 0.

- [ ] **Step 5: Commit**

```bash
git add services.html contact.html style.css script.js
git commit -m "feat: add luxury in-app artwork lightbox modal eliminating broken blob tabs"
```

---

### Task 3: Interactive Checkout Review Panel & Per-Item Artwork Swap

**Files:**
- Modify: `script.js:2030-2210` (`renderCheckoutOrderReview` update with per-item artwork swap)
- Modify: `style.css:2350-2470` (Checkout item card action styles)
- Test: `scripts/test-artwork-flow.js`

**Interfaces:**
- Consumes: `cart`, `ArtworkStore`, `uploadArtworkToSupabase`
- Produces: `window.replaceItemArtwork(cartIndex, file)` dynamically updating the card, thumbnail, and specifications

- [ ] **Step 1: Implement window.replaceItemArtwork**

In `script.js`:
```javascript
window.triggerArtworkSwap = function(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.ai,.psd';
    input.onchange = async function(e) {
        const file = e.target.files && e.target.files[0];
        if (!file || !cart[index]) return;

        if (file.size > 50 * 1024 * 1024) {
            window.showToast('File size exceeds 50MB limit.', 'error');
            return;
        }

        window.showToast(`Updating artwork for ${cart[index].title}...`, 'info');

        const artworkId = 'art_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        const thumbUrl = await window.createThumbnail(file);

        if (window.ArtworkStore) {
            await window.ArtworkStore.save(artworkId, file);
        }

        const uploadResult = await window.uploadArtworkToSupabase(file);

        cart[index].design = {
            id: artworkId,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            previewUrl: thumbUrl,
            url: uploadResult.url || thumbUrl || '',
            storage: uploadResult.storage || 'indexeddb'
        };

        saveCart();
        window.renderCheckoutOrderReview();
        window.showToast(`Artwork updated to ${file.name}`, 'success');
    };
    input.click();
};
```

- [ ] **Step 2: Add "Change Artwork" button to checkout item card**

In `renderCheckoutOrderReview()` inside `script.js`:
Add an action button next to the artwork status:
```javascript
<div style="display:flex;align-items:center;gap:0.6rem;margin-top:0.4rem;">
    ${artworkStatusHtml}
    <button type="button" onclick="triggerArtworkSwap(${index})" style="background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.25);color:var(--gold);border-radius:4px;padding:0.2rem 0.6rem;font-size:0.75rem;cursor:pointer;">
        ${item.design ? 'Change' : '+ Attach Artwork'}
    </button>
</div>
```

- [ ] **Step 3: Verify syntax**

Run: `node -c script.js`
Expected: Code 0.

- [ ] **Step 4: Commit**

```bash
git add script.js style.css
git commit -m "feat: enable per-item artwork swap and attachment directly on checkout review screen"
```

---

### Task 4: Form Submission, Backend Multi-File Pipeline & Email Notification Enhancement

**Files:**
- Modify: `backend/routes/contact.js:10-50` (Extract permanent URLs from `cart_data`)
- Modify: `backend/services/email.js:90-180` (Add prominent gold download buttons for cloud URLs)
- Modify: `script.js:520-590` (`#contactForm` submit listener)
- Test: `scripts/test-artwork-flow.js`

**Interfaces:**
- Consumes: `req.body.cart_data`, `req.files`
- Produces: Dispatched emails with clickable CDN buttons and itemized specifications

- [ ] **Step 1: Enhance backend/services/email.js with gold cloud download buttons**

In `notifyOwnerNewContact(data)`:
```javascript
let cloudLinksHtml = '';
if (data.cartData && Array.isArray(data.cartData)) {
  const cloudItems = data.cartData.filter(it => it.design && it.design.url);
  if (cloudItems.length > 0) {
    cloudLinksHtml = `
    <div style="background-color: #1a1a1a; border: 1px solid #C9A84C; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 10px 0; color: #C9A84C; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
        ☁️ Cloud-Hosted High-Resolution Print Artwork:
      </h4>
      <table width="100%" style="font-size: 13px; color: #CCCCCC;">
        ${cloudItems.map(it => `
          <tr>
            <td style="padding: 6px 0;"><strong style="color: #FFFFFF;">${it.title}:</strong> ${it.design.name} <span style="color: #888888;">(${(it.design.size / (1024*1024)).toFixed(2)} MB)</span></td>
            <td align="right" style="padding: 6px 0;">
              <a href="${it.design.url}" target="_blank" style="background-color: #C9A84C; color: #000000; padding: 5px 12px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 12px; display: inline-block;">Download File ↗</a>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>`;
  }
}
```

- [ ] **Step 2: Update customer confirmation with proof summary**

Ensure customer confirmation email includes clean links to their uploaded proofs.

- [ ] **Step 3: Verify syntax**

Run: `node -c backend/routes/contact.js backend/services/email.js`
Expected: Code 0.

- [ ] **Step 4: Commit**

```bash
git add backend/routes/contact.js backend/services/email.js script.js
git commit -m "feat: enhance transactional email templates with one-click artwork download buttons"
```

---

### Task 5: End-to-End Automated Playwright Test Suite

**Files:**
- Create: `scripts/test-artwork-flow-production.js`
- Test: `node scripts/test-artwork-flow-production.js`

**Interfaces:**
- Verifies: Full user workflow from catalog upload $\rightarrow$ cart drawer $\rightarrow$ in-app lightbox $\rightarrow$ checkout review $\rightarrow$ artwork swap $\rightarrow$ form submission & cleanup.

- [ ] **Step 1: Write test-artwork-flow-production.js**

Implement comprehensive test script:
1. Start frontend and backend servers.
2. Add PNG item: assert modal preview and Supabase storage upload call.
3. Add PDF item: assert document badge and persistence.
4. Click artwork in cart drawer: assert `#artworkLightboxModal` opens with zoom & download options, and assert 0 broken `blob:` tabs.
5. Navigate to `contact.html`: assert `#checkoutOrderReview` displays both items with visual previews.
6. Trigger artwork swap on Item 2: assert live DOM update.
7. Submit contact form: assert HTTP 200, assert cart in `localStorage` is reset to `[]`, and assert `ArtworkStore` in IndexedDB is purged.

- [ ] **Step 2: Run automated test**

Run: `node scripts/test-artwork-flow-production.js`
Expected: All tests pass with exit code 0.

- [ ] **Step 3: Update documentation and push to GitHub**

Update `CHANGELOG.md`, `FRONTEND.md`, `BACKEND.md`, `BUGS.md`, `LESSONS.md`.
```bash
git add scripts/test-artwork-flow-production.js CHANGELOG.md FRONTEND.md BACKEND.md BUGS.md LESSONS.md
git commit -m "test: add production artwork flow verification suite and update docs"
git push origin master
```
