-- ==========================================
-- APEX PRINT HUB DATABASE SCHEMA (SUPABASE)
-- ==========================================

-- 1. ADMIN USERS
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONTACT SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(10),
    service VARCHAR(255),
    message TEXT,
    ip_address VARCHAR(45),
    status VARCHAR(50) DEFAULT 'new', -- new, read, replied
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. QUOTE REQUESTS
CREATE TABLE IF NOT EXISTS public.quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(10),
    service VARCHAR(255) NOT NULL,
    quantity INTEGER,
    size VARCHAR(100),
    paper_type VARCHAR(100),
    finishing VARCHAR(100),
    sides VARCHAR(50),
    artwork_ready VARCHAR(50),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, completed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EXCHANGE RATES (Cache)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id SERIAL PRIMARY KEY,
    base VARCHAR(10) DEFAULT 'AED',
    sar_rate NUMERIC(10, 6) NOT NULL,
    pkr_rate NUMERIC(10, 6) NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_contact_email ON public.contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_created_at ON public.contact_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_email ON public.quote_requests(email);
CREATE INDEX IF NOT EXISTS idx_quote_status ON public.quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_created_at ON public.quote_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_fetched_at ON public.exchange_rates(fetched_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Admin Users Policies
CREATE POLICY "Allow service_role to manage admins" ON public.admin_users FOR ALL USING (true);

-- Contact Submissions Policies
CREATE POLICY "Allow anonymous inserts for contact" ON public.contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service_role all access contact" ON public.contact_submissions FOR ALL USING (true);

-- Quote Requests Policies
CREATE POLICY "Allow anonymous inserts for quotes" ON public.quote_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service_role all access quotes" ON public.quote_requests FOR ALL USING (true);

-- Exchange Rates Policies
CREATE POLICY "Allow service_role all access exchange_rates" ON public.exchange_rates FOR ALL USING (true);
CREATE POLICY "Allow anonymous read exchange_rates" ON public.exchange_rates FOR SELECT USING (true);
