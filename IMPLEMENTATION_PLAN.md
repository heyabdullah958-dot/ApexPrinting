# 🖨️ PRESTIGE PRESS — Full Website Implementation Plan
# Saved: 2026-07-09
# Project Folder: D:\sitesdata\New folder (2)\

================================================================

## 🔍 BUSINESS ANALYSIS
After scanning all 27 product documents (PDFs, DOCX, images),
this is a premium commercial printing house serving corporates,
SMEs, and retail brands. Products range from stationery to packaging.

Business Name : PRESTIGE PRESS
Tagline       : Where Every Print Tells a Story
Theme         : Black & Gold — Luxury, High-End, Professional

================================================================

## 🎨 DESIGN SYSTEM

Colors (CSS Variables):
  --color-black       : #0a0a0a   (deep black background)
  --color-black-soft  : #111111   (card backgrounds)
  --color-black-mid   : #1a1a1a   (section alternating bg)
  --color-gold        : #C9A84C   (primary gold)
  --color-gold-light  : #E8C97A   (hover / highlight gold)
  --color-gold-dark   : #A07830   (deep gold shadows)
  --color-white       : #FFFFFF   (primary text)
  --color-white-soft  : #F5F5F0   (secondary text)
  --color-gray        : #888888   (muted text)

Fonts (Google Fonts):
  Display / Hero  : Playfair Display  (elegant serif)
  Body / UI       : Inter             (clean sans-serif)
  Labels / Badges : Montserrat        (all-caps tracking)

================================================================

## 📦 SERVICE CATEGORIES (Client Confirmed)

1. BRAND IDENTITY SUITE
   - Business Cards
   - Letterhead
   - Envelopes
   - Presentation Folders

2. MARKETING & PROMOTIONAL MEDIA
   - Flyers
   - Posters
   - Brochures
   - Booklets

3. BUSINESS OPERATIONS & LOGISTICS
   - NCR Forms
   - Notepads
   - Promotional Pads

4. PACKAGING
   - Paper Bags

================================================================

## 📁 FILES TO BUILD (5 TOTAL)

  index.html      ← Home page
  services.html   ← All 4 categories with service cards
  contact.html    ← Contact form + contact info
  style.css       ← Shared stylesheet (CSS variables + responsive)
  script.js       ← Shared JavaScript (nav, animations, form, filter)

All files go in: D:\sitesdata\New folder (2)\

================================================================

## 📐 PAGE-BY-PAGE BREAKDOWN

---------------------------------------------------
PAGE 1: index.html — HOME
---------------------------------------------------

SECTION 1: NAVBAR (Sticky)
  - Left  : Logo (PP monogram) + "PRESTIGE PRESS" text
  - Right : Home | Services | Contact | "Get a Quote" button
  - Mobile: Hamburger menu (☰ → X animation)
  - Effect: Transparent at top → dark glass blur on scroll

SECTION 2: HERO (Full Screen 100vh)
  - Dark black gradient background
  - Gold geometric line pattern overlay (CSS pseudo-element)
  - Pre-title : "PREMIUM PRINTING SERVICES" (gold, Montserrat)
  - H1        : "Where Every Print Tells a Story" (Playfair Display)
  - Subtitle  : Descriptive tagline paragraph
  - Buttons   : "Request a Quote" (gold fill) + "View Our Services" (outline)
  - Bottom    : Animated scroll-down chevron

SECTION 3: STATS STRIP
  - 4 animated counters (count up when scrolled into view):
    500+ Clients | 15+ Years | 30+ Products | Fast Turnaround
  - Gold dividers between items

SECTION 4: SERVICES PREVIEW
  - Heading: "Our Services" with gold underline accent
  - Grid of 4 category cards (2x2 desktop, 1 col mobile)
  - Each card: SVG icon + category name + short desc + link
  - Hover: gold border glow + card lifts 8px

SECTION 5: WHY CHOOSE US
  - Split layout: left text panel, right decorative element
  - 4 bullet points with gold checkmark icons:
    * High-Quality Offset & Digital Printing
    * Rapid Turnaround Times
    * Custom Design Assistance
    * Competitive Bulk Pricing

SECTION 6: CTA BANNER
  - Full-width gold gradient background
  - Heading: "Ready to Print Something Extraordinary?"
  - Buttons: "Get a Free Quote" + "Call Us Today"

SECTION 7: FOOTER
  - 3 columns: Brand info | Quick Links | Contact Info
  - Social media icons: Facebook, Instagram, LinkedIn, Twitter/X
  - Copyright line
  - Full dark background

---------------------------------------------------
PAGE 2: services.html — SERVICES
---------------------------------------------------

MINI HERO (40vh)
  - "Our Services" heading + gold breadcrumb

CATEGORY FILTER BAR (Sticky)
  - Tabs: All | Brand Identity | Marketing | Operations | Packaging
  - JS-powered: click tab → matching cards visible, others hidden
  - Active tab highlighted in gold

CATEGORY 1 — BRAND IDENTITY SUITE (4 cards)
  1. Business Cards      — "First impressions in your hands"
  2. Letterhead          — "Your brand on every line"
  3. Envelopes           — "Sealed with professionalism"
  4. Presentation Folders — "Hold your story together"

CATEGORY 2 — MARKETING & PROMOTIONAL MEDIA (4 cards)
  1. Flyers    — "Grab attention at a glance"
  2. Posters   — "Large-format visual impact"
  3. Brochures — "Tri-fold, bi-fold, gate-fold options"
  4. Booklets  — "Catalogs to annual reports"

CATEGORY 3 — BUSINESS OPERATIONS & LOGISTICS (3 cards)
  1. NCR Forms        — "Multi-copy carbonless duplicate forms"
  2. Notepads         — "Your brand in every note"
  3. Promotional Pads — "Give away your brand daily"

CATEGORY 4 — PACKAGING (1 card)
  1. Paper Bags — "Custom branded bags in 14+ sizes"

EACH CARD STRUCTURE:
  - SVG Icon (relevant to product)
  - Category badge label
  - Product name (H3)
  - Short description
  - "Request Quote →" button (links to contact.html)
  Hover effect: gold border + lift + shimmer animation

---------------------------------------------------
PAGE 3: contact.html — CONTACT
---------------------------------------------------

MINI HERO (40vh)
  - "Get In Touch" heading + subtitle

MAIN SECTION (2-column layout)
  LEFT — Contact Form:
    - Full Name (text input)
    - Email Address (email input)
    - Phone Number (tel input)
    - Select a Service (dropdown, grouped by category):
        [Brand Identity Suite]
          > Business Cards
          > Letterhead
          > Envelopes
          > Presentation Folders
        [Marketing & Promotional Media]
          > Flyers
          > Posters
          > Brochures
          > Booklets
        [Business Operations & Logistics]
          > NCR Forms
          > Notepads
          > Promotional Pads
        [Packaging]
          > Paper Bags
    - Your Message (textarea)
    - "Send Message" button (gold CTA)
    - Form states: validation errors, loading spinner, success message

  RIGHT — Contact Information Panel:
    - 📍 Address placeholder
    - 📞 Phone placeholder
    - 📧 Email placeholder
    - 🕐 Business Hours
    - Social media links

MAP SECTION (full-width)
  - Styled iframe/div placeholder with gold border

================================================================

## ⚙️ style.css — CSS ARCHITECTURE

1.  CSS Custom Properties (all colors, fonts, spacing, radii)
2.  CSS Reset + Base (box-sizing, margin, padding, scroll-behavior)
3.  Typography scale (h1–h6, p, a, span sizing)
4.  Shared layout utilities (container, section padding, grid)
5.  Navigation + hamburger button + mobile menu
6.  Hero section + keyframe animations (fade-in, slide-up)
7.  Stats strip + counter
8.  Service card grid (CSS Grid, auto-fill, hover effects)
9.  Category filter bar + active tab
10. Why-us split section
11. CTA banner (gold gradient)
12. Contact form + input styles + focus states
13. Contact info panel
14. Footer (3-col grid)
15. Responsive breakpoints:
      @media (max-width: 1024px)  — tablet adjustments
      @media (max-width: 768px)   — mobile layout switch
      @media (max-width: 480px)   — small phone adjustments

Key CSS techniques:
  - backdrop-filter: blur(20px)  → glass navbar on scroll
  - CSS Grid + auto-fill         → responsive card grid
  - @keyframes shimmer           → gold button hover sweep
  - clip-path: polygon(...)      → angled section dividers
  - CSS custom properties        → easy color changes later

================================================================

## ⚙️ script.js — JAVASCRIPT FEATURES

1. Navbar scroll class → glass effect triggers on scroll > 50px
2. Hamburger open/close → animated X morph
3. Close mobile menu when nav link is clicked
4. Smooth scroll for all anchor links
5. IntersectionObserver → fade-in/slide-up animation on scroll entry
6. Animated number counters (stats section)
7. Services filter → click category tab → show/hide matching cards
8. Contact form validation (check all fields before submit)
9. Form submit success state → show confirmation message
10. Active page detection → highlight correct nav link in gold
11. Service card "Request Quote" → pre-fill the service dropdown on contact page

================================================================

## 🔢 BUILD ORDER (when coding begins)

Step 1 → style.css     (complete shared stylesheet)
Step 2 → index.html    (complete home page)
Step 3 → services.html (complete services page)
Step 4 → contact.html  (complete contact page)
Step 5 → script.js     (all JavaScript functionality)

================================================================

## ✅ COMPLETION CHECKLIST

[ ] All 5 files complete — zero placeholders, zero TODOs
[ ] All colors use CSS variables
[ ] Responsive at 320px, 480px, 768px, 1024px+
[ ] Hamburger menu works and closes on link click
[ ] All service cards have gold hover border animation
[ ] Contact form validates before submission
[ ] Service dropdown grouped by all 4 categories
[ ] Footer links connect all pages correctly
[ ] Smooth scroll works on all anchor links
[ ] Sticky navbar works on all 3 pages
[ ] Google Fonts loaded in all HTML heads
[ ] SEO meta tags on every page (title, description)
[ ] Active nav link highlighted per page

================================================================

## 📝 NOTES FROM CLIENT (WhatsApp, 05/07/2026)

Theme: Black and Gold
Categories:
  Brand Identity Suite — Business cards, Letterhead, Envelopes, Presentation folders
  Marketing & Promotional Media — Flyers, Posters, Brochures, Booklets
  Business Operations & Logistics — NCR forms, Notepads, Promotional pads
  Packaging — Paper bags

================================================================
END OF PLAN
================================================================
