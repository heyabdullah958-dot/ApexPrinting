# 🔧 PRESTIGE PRESS — Backend Implementation Plan
# Saved: 2026-07-09
# Project Folder: D:\sitesdata\New folder (2)\backend\

================================================================
## OVERVIEW
================================================================

This backend powers the Prestige Press printing services website.
It handles:
  1. Contact form submissions (save to DB + email notification)
  2. Quote request submissions (save to DB + email notification)
  3. Stripe payment processing (for order deposits/full payments)
  4. Admin email alerts on every new inquiry or payment

Tech Stack:
  Runtime   : Node.js (v18+)
  Framework : Express.js
  Database  : Supabase (PostgreSQL via @supabase/supabase-js)
  Email     : Nodemailer (Gmail SMTP)
  Payments  : Stripe (stripe npm package)
  Env vars  : dotenv
  CORS      : cors npm package
  Security  : helmet, express-rate-limit

================================================================
## FOLDER STRUCTURE
================================================================

/backend
  ├── server.js              ← Main entry point (Express app)
  ├── routes/
  │   ├── contact.js         ← POST /api/contact
  │   ├── quote.js           ← POST /api/quote
  │   └── payments.js        ← POST /api/payments/create-intent
  │                             POST /api/payments/webhook
  ├── services/
  │   ├── supabase.js        ← Supabase client singleton
  │   ├── email.js           ← Nodemailer transporter + send functions
  │   └── stripe.js          ← Stripe client singleton
  ├── middleware/
  │   ├── validate.js        ← Input validation middleware
  │   └── rateLimiter.js     ← Rate limiting per route
  ├── .env.example           ← Template for environment variables
  ├── package.json           ← Dependencies + scripts
  └── README.md              ← Setup instructions

================================================================
## ENVIRONMENT VARIABLES (.env.example)
================================================================

# --- Supabase ---
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# --- Email (Gmail SMTP) ---
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-gmail-app-password
OWNER_EMAIL=owner@businessemail.com

# --- Stripe ---
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# --- Server ---
PORT=3000
FRONTEND_URL=http://localhost:5500
NODE_ENV=production

================================================================
## SUPABASE DATABASE SCHEMA (SQL — run in Supabase Dashboard)
================================================================

--- TABLE 1: contact_submissions ---
CREATE TABLE contact_submissions (
  id           UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT      NOT NULL,
  email        TEXT      NOT NULL,
  phone        TEXT,
  service      TEXT,
  message      TEXT,
  status       TEXT      DEFAULT 'new',     -- new / read / replied
  created_at   TIMESTAMP DEFAULT NOW()
);

--- TABLE 2: quote_requests ---
CREATE TABLE quote_requests (
  id              UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT      NOT NULL,
  email           TEXT      NOT NULL,
  phone           TEXT,
  service         TEXT      NOT NULL,
  quantity        INTEGER,
  size            TEXT,
  paper_type      TEXT,
  finishing       TEXT,     -- lamination, spot UV, etc.
  notes           TEXT,
  status          TEXT      DEFAULT 'pending',  -- pending / quoted / accepted
  created_at      TIMESTAMP DEFAULT NOW()
);

--- TABLE 3: payments ---
CREATE TABLE payments (
  id                  UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_payment_id   TEXT      NOT NULL UNIQUE,
  customer_name       TEXT,
  customer_email      TEXT,
  service             TEXT,
  amount              INTEGER,  -- amount in cents
  currency            TEXT      DEFAULT 'usd',
  status              TEXT,     -- succeeded / pending / failed
  created_at          TIMESTAMP DEFAULT NOW()
);

--- Row-Level Security (RLS) ---
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow insert only (anon can submit, cannot read)
CREATE POLICY "Allow insert" ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON quote_requests      FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON payments            FOR INSERT WITH CHECK (true);

================================================================
## API ENDPOINTS — FULL SPECIFICATION
================================================================

--------------------------------------------------
ENDPOINT 1: POST /api/contact
--------------------------------------------------
Purpose    : Receive contact form submission
Accepts    : application/json
Auth       : None (public)
Rate Limit : 5 requests per IP per 15 minutes

Request Body:
{
  "name"    : "John Doe",
  "email"   : "john@example.com",
  "phone"   : "+1 555 0000",
  "service" : "Business Cards",
  "message" : "I need 500 business cards printed..."
}

Validation Rules:
  - name    : required, min 2 chars, max 100
  - email   : required, valid email format
  - phone   : optional, string
  - service : required, must match known service list
  - message : required, min 10 chars, max 2000

Processing Steps:
  1. Validate request body (middleware)
  2. Sanitize inputs (trim whitespace, strip HTML)
  3. Insert into Supabase contact_submissions table
  4. Send notification email to owner with full details
  5. Send confirmation email to customer
  6. Return success JSON response

Success Response (200):
{
  "success": true,
  "message": "Thank you! We received your message and will be in touch soon."
}

Error Response (400 validation / 500 server):
{
  "success": false,
  "message": "Something went wrong. Please try again.",
  "errors": [...]  // only in development mode
}

--------------------------------------------------
ENDPOINT 2: POST /api/quote
--------------------------------------------------
Purpose    : Receive detailed quote request
Accepts    : application/json
Auth       : None (public)
Rate Limit : 5 requests per IP per 15 minutes

Request Body:
{
  "name"       : "Jane Smith",
  "email"      : "jane@company.com",
  "phone"      : "+1 555 1111",
  "service"    : "Brochures",
  "quantity"   : 1000,
  "size"       : "A4",
  "paper_type" : "300gsm Gloss",
  "finishing"  : "Spot UV",
  "notes"      : "Full colour, double sided..."
}

Processing Steps:
  1. Validate body
  2. Insert into quote_requests table
  3. Send detailed quote request email to owner
  4. Send "quote received" confirmation to customer
  5. Return success response

--------------------------------------------------
ENDPOINT 3: POST /api/payments/create-intent
--------------------------------------------------
Purpose    : Create a Stripe PaymentIntent (deposit or full payment)
Accepts    : application/json
Auth       : None (public, amount calculated server-side)
Rate Limit : 10 requests per IP per hour

Request Body:
{
  "service"          : "Business Cards",
  "quantity"         : 500,
  "customer_name"    : "John Doe",
  "customer_email"   : "john@example.com",
  "payment_type"     : "deposit"  // "deposit" or "full"
}

Processing Steps:
  1. Validate inputs
  2. Calculate amount server-side based on service + quantity
     (pricing config object in server — never trust client-sent amount)
  3. Create Stripe PaymentIntent with calculated amount
  4. Return client_secret to frontend for Stripe.js to complete payment

Success Response (200):
{
  "success"       : true,
  "clientSecret"  : "pi_xxx_secret_xxx",
  "amount"        : 4999,       // in cents = $49.99
  "currency"      : "usd",
  "paymentIntentId" : "pi_xxx"
}

--------------------------------------------------
ENDPOINT 4: POST /api/payments/webhook
--------------------------------------------------
Purpose    : Stripe webhook — called by Stripe after payment
Accepts    : Raw body (application/octet-stream)
Auth       : Stripe-Signature header verification
Rate Limit : None (trusted source)

Processing Steps:
  1. Verify Stripe webhook signature (prevents spoofing)
  2. Parse event type:
       payment_intent.succeeded  → save to payments table + send receipt emails
       payment_intent.failed     → log failure
       charge.refunded           → update payments table
  3. Save payment record to Supabase payments table
  4. Send payment confirmation email to customer
  5. Send payment notification email to owner
  6. Return 200 OK (must respond fast — Stripe retries on timeout)

================================================================
## EMAIL TEMPLATES
================================================================

--- EMAIL 1: Owner Notification (new contact form) ---
Subject : 🖨️ New Contact Form — [Service] from [Name]
Body:
  New inquiry received from Prestige Press website.

  Customer Name    : {name}
  Email            : {email}
  Phone            : {phone}
  Service Interest : {service}
  Message:
    {message}

  Submitted at: {timestamp}
  Reply at    : {email}

--- EMAIL 2: Customer Confirmation (contact form) ---
Subject : We received your message — Prestige Press
Body:
  Dear {name},

  Thank you for reaching out to Prestige Press!
  We have received your enquiry regarding {service}.
  Our team will review your message and get back to
  you within 24 business hours.

  Enquiry Summary:
    Service  : {service}
    Message  : {message}

  Contact us directly:
    Email : owner@prestigepress.com
    Phone : +1 (555) 000-0000

  Best regards,
  Prestige Press Team

--- EMAIL 3: Owner Notification (quote request) ---
Subject : 📋 New Quote Request — [Service] from [Name]
Body:
  Full quote details including quantity, size, paper type, finishing.

--- EMAIL 4: Customer Confirmation (payment) ---
Subject : ✅ Payment Confirmed — Prestige Press
Body:
  Payment receipt with amount, service, and reference number.

--- EMAIL 5: Owner Notification (payment received) ---
Subject : 💳 Payment Received — [Amount] for [Service] from [Name]
Body:
  Payment confirmed via Stripe.
  Customer, amount, service, Stripe Payment ID.

================================================================
## STRIPE INTEGRATION — DETAILED PLAN
================================================================

How Stripe works in this system:
  1. Customer fills out order form on frontend
  2. Frontend calls POST /api/payments/create-intent
  3. Backend creates PaymentIntent → returns clientSecret
  4. Frontend loads Stripe.js + mounts Card Element
  5. Customer enters card details (never touches our server)
  6. Frontend calls stripe.confirmCardPayment(clientSecret)
  7. Stripe processes payment
  8. Stripe calls our webhook endpoint with result
  9. Backend saves payment record + sends emails

Stripe Elements needed on frontend (contact.html or new payment.html):
  - <script src="https://js.stripe.com/v3/"></script>
  - var stripe = Stripe(PUBLISHABLE_KEY);
  - var elements = stripe.elements();
  - var card = elements.create('card', { style: cardStyle });
  - card.mount('#card-element');

Pricing Logic (server-side only — never send price from client):
  const PRICING = {
    'Business Cards'        : { basePrice: 2500, perUnit: 5 },   // cents
    'Letterhead'            : { basePrice: 3000, perUnit: 8 },
    'Envelopes'             : { basePrice: 2000, perUnit: 6 },
    'Presentation Folders'  : { basePrice: 4500, perUnit: 12 },
    'Flyers'                : { basePrice: 1500, perUnit: 3 },
    'Posters'               : { basePrice: 5000, perUnit: 20 },
    'Brochures'             : { basePrice: 3500, perUnit: 10 },
    'Booklets'              : { basePrice: 8000, perUnit: 25 },
    'NCR Forms'             : { basePrice: 4000, perUnit: 15 },
    'Notepads'              : { basePrice: 2500, perUnit: 8 },
    'Promotional Pads'      : { basePrice: 2000, perUnit: 6 },
    'Paper Bags'            : { basePrice: 3000, perUnit: 10 },
  };

  Deposit = 30% of total order value
  Full    = 100% of total order value

================================================================
## NPM DEPENDENCIES
================================================================

Production dependencies (package.json):
  "express"              : "^4.18.2"    ← HTTP server framework
  "@supabase/supabase-js": "^2.39.0"   ← Supabase DB client
  "nodemailer"           : "^6.9.7"    ← Email sending
  "stripe"               : "^14.10.0"  ← Stripe payments
  "dotenv"               : "^16.3.1"   ← Environment variables
  "cors"                 : "^2.8.5"    ← Cross-origin requests
  "helmet"               : "^7.1.0"    ← HTTP security headers
  "express-rate-limit"   : "^7.1.5"    ← API rate limiting
  "express-validator"    : "^7.0.1"    ← Input validation

Dev dependencies:
  "nodemon"              : "^3.0.2"    ← Auto-restart on file change

npm scripts:
  "start" : "node server.js"
  "dev"   : "nodemon server.js"

================================================================
## SECURITY MEASURES
================================================================

1. CORS              : Only allow requests from FRONTEND_URL
2. Helmet            : Sets secure HTTP headers automatically
3. Rate Limiting     : Prevent spam/abuse on form endpoints
4. Input Validation  : express-validator on all POST bodies
5. Input Sanitization: Trim and strip dangerous characters
6. Stripe Webhook    : Verify Stripe-Signature header on webhook
7. RLS Policies      : Supabase Row Level Security blocks direct reads
8. Env Variables     : All secrets in .env — never hardcoded
9. Error Messages    : Generic errors in production (no stack traces)
10. Service Allowlist : Reject requests for unknown service names

================================================================
## BUILD ORDER (step by step when coding begins)
================================================================

Step 1 → package.json       (define all dependencies + scripts)
Step 2 → .env.example       (document all required env variables)
Step 3 → services/supabase.js    (Supabase client singleton)
Step 4 → services/email.js       (Nodemailer transporter + templates)
Step 5 → services/stripe.js      (Stripe client singleton)
Step 6 → middleware/validate.js  (Input validation rules)
Step 7 → middleware/rateLimiter.js (Rate limit configs)
Step 8 → routes/contact.js      (POST /api/contact — full logic)
Step 9 → routes/quote.js        (POST /api/quote — full logic)
Step 10 → routes/payments.js    (POST /api/payments/* — full logic)
Step 11 → server.js             (Wire everything together)
Step 12 → README.md             (Setup + deployment instructions)

================================================================
## FRONTEND CHANGES NEEDED (contact.html / new payment.html)
================================================================

1. Update contact form fetch URL to: http://localhost:3000/api/contact
2. Add Stripe.js <script> tag
3. Add #card-element div for Stripe Card UI
4. Add payment form with service + quantity inputs
5. JS to call /api/payments/create-intent then confirmCardPayment
6. Show payment success/error states

================================================================
## DEPLOYMENT OPTIONS (when ready to go live)
================================================================

Option A: Railway (Recommended — easiest)
  - Connect GitHub repo
  - Add all .env variables in Railway dashboard
  - Auto-deploys on push
  - Free tier available

Option B: Render.com
  - Similar to Railway
  - Free tier with spin-down on inactivity

Option C: VPS (DigitalOcean / Linode)
  - More control, requires PM2 + Nginx setup
  - Best for production at scale

Stripe Webhook on Deployment:
  - Register webhook URL in Stripe Dashboard:
    https://your-domain.com/api/payments/webhook
  - Event to listen for: payment_intent.succeeded, payment_intent.failed

================================================================
## COMPLETION CHECKLIST
================================================================

BACKEND FILES:
[x] package.json                  complete
[x] .env.example                  complete
[x] server.js                     complete
[x] services/supabase.js          complete
[x] services/email.js             complete
[x] services/stripe.js            complete
[x] middleware/validate.js        complete
[x] middleware/rateLimiter.js     complete
[x] routes/contact.js             complete
[x] routes/quote.js               complete
[x] routes/payments.js            complete
[x] README.md                     complete

DATABASE:
[x] contact_submissions table     SQL ready
[x] quote_requests table          SQL ready
[x] payments table                SQL ready
[x] RLS policies                  SQL ready

FUNCTIONALITY:
[x] Contact form saves to Supabase
[x] Owner gets email on new contact
[x] Customer gets confirmation email
[x] Quote form saves to Supabase
[x] Stripe PaymentIntent creates correctly
[x] Stripe webhook verifies signature
[x] Payment record saves to Supabase
[x] Payment receipt email sent to customer
[x] Payment notification sent to owner
[x] Rate limiting active on all public routes
[x] CORS restricted to frontend URL
[x] All env variables in .env (none hardcoded)
[x] Zero TODOs, zero placeholders

================================================================
## CLIENT NOTES
================================================================
Payment methods to integrate: STRIPE
Frontend: HTML / CSS / Vanilla JS (already built)
Backend must be completely separate (/backend folder)
No Prisma, no ORM — Supabase client only
Supabase for DB, Gmail SMTP for emails

================================================================
END OF BACKEND PLAN
================================================================
