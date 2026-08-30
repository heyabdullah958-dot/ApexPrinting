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

