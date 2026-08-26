# LESSONS.md
## Auto-generated — 2026-08-26
### Detected from codebase scan

This log tracks generalized patterns, wrong assumptions, and root causes across sessions to prevent repeated errors.

---

## Lesson 1 — Form Handlers & Inline Script Audit — 2026-08-26
- **Pattern**: Modifying frontend submit workflows in multi-page vanilla HTML/JS applications.
- **Wrong assumption made**: Assuming that form submissions are only controlled by the main global `script.js` bundle.
- **What actually mattered**: Individual HTML pages may contain legacy inline `<script>` blocks or prototype listeners that conflict with the global script, sending redundant or outdated HTTP requests to abandoned domains (e.g. Render vs Vercel/Localhost). Always grep for `addEventListener('submit'` across all HTML files when modifying form flows.
- **Applies to**: `*.html`, `script.js`, any frontend form integrations.
