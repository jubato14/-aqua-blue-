-- SCHEMA FOR AQUA BLUE APP WITH SUPABASE
-- COPY AND PASTE THIS SCRIPT INTO THE SUPABASE SQL EDITOR

-- 1. Enable UUID Extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- auth.uid() mapped as text
    email TEXT,
    "displayName" TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'pending',
    "linkedCustomerId" TEXT,
    "linkedCustomerPhone" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY DEFAULT 'settings',
    value JSONB DEFAULT '{}'::jsonb,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial system settings if not exists
INSERT INTO public.system_settings (key, value)
VALUES ('settings', '{"ownerUid": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    name TEXT NOT NULL,
    phone1 TEXT,
    phone2 TEXT,
    phone3 TEXT,
    region TEXT,
    "addressDetail" TEXT,
    "deviceType" TEXT,
    "lastService" TEXT,
    "nextService" TEXT,
    image TEXT,
    stages JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    "visitHistory" JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create External Visits Table
CREATE TABLE IF NOT EXISTS public.external_visits (
    id TEXT PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    date TEXT NOT NULL,
    details TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Row Level Security (RLS) Configuration

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_visits ENABLE ROW LEVEL SECURITY;

-- Helper functions for security matching rules
CREATE OR REPLACE FUNCTION public.is_owner(uid TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = uid AND (role = 'owner' OR email = 'belalellol123@gmail.com')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_approved(uid TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = uid AND (status = 'approved' OR email = 'belalellol123@gmail.com')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_role(uid TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE((SELECT role FROM public.users WHERE id = uid), 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURE POLICIES:

-- Users Policies
CREATE POLICY "Users are readable by signed-in users"
    ON public.users FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can edit their own basic info or owners can change everything"
    ON public.users FOR UPDATE
    USING (auth.uid()::text = id OR public.is_owner(auth.uid()::text));

CREATE POLICY "Only owners can delete users"
    ON public.users FOR DELETE
    USING (public.is_owner(auth.uid()::text));


-- System Settings Policies
CREATE POLICY "System settings readable by all signed-in"
    ON public.system_settings FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "System settings writable only by owner"
    ON public.system_settings FOR ALL
    USING (public.is_owner(auth.uid()::text));


-- Customers Policies
CREATE POLICY "Customers readable by all approved users"
    ON public.customers FOR SELECT
    USING (public.is_approved(auth.uid()::text));

CREATE POLICY "Approved roles can create/update customers"
    ON public.customers FOR ALL
    USING (
        public.is_owner(auth.uid()::text) OR 
        public.get_role(auth.uid()::text) = 'user' OR 
        public.get_role(auth.uid()::text) = 'customer_service'
    );


-- Inventory Policies
CREATE POLICY "Inventory readable by all approved users"
    ON public.inventory FOR SELECT
    USING (public.is_approved(auth.uid()::text));

CREATE POLICY "Approved roles can manage inventory"
    ON public.inventory FOR ALL
    USING (
        public.is_owner(auth.uid()::text) OR 
        public.get_role(auth.uid()::text) = 'user' OR 
        public.get_role(auth.uid()::text) = 'storekeeper' OR 
        public.get_role(auth.uid()::text) = 'customer_service'
    );


-- External Visits Policies
CREATE POLICY "External visits readable by all approved users"
    ON public.external_visits FOR SELECT
    USING (public.is_approved(auth.uid()::text));

CREATE POLICY "Approved users can manage external visits"
    ON public.external_visits FOR ALL
    USING (
        public.is_owner(auth.uid()::text) OR 
        public.get_role(auth.uid()::text) = 'user'
    );
