-- Users (Profiles) Table
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  "displayName" TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "linkedCustomerId" TEXT,
  "linkedCustomerPhone" TEXT
);

-- Customers Table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone1 TEXT,
  phone2 TEXT,
  phone3 TEXT,
  address TEXT,
  "deviceType" TEXT,
  "lastService" DATE,
  "nextService" DATE,
  "installDate" DATE,
  notes TEXT,
  status TEXT DEFAULT 'active',
  stages JSONB,
  "visitHistory" JSONB,
  image TEXT,
  "ownerId" UUID REFERENCES auth.users(id),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Table
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  "ownerId" UUID REFERENCES auth.users(id)
);

-- System Settings
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB
);

-- External Visits 
CREATE TABLE external_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "ownerId" UUID REFERENCES auth.users(id),
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerAddress" TEXT,
  "deviceType" TEXT,
  "visitDate" DATE,
  "changedStages" JSONB,
  "usedParts" JSONB,
  notes TEXT,
  "continueWithUs" BOOLEAN,
  price NUMERIC,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and setup policies (simplistic for now)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON users FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all for authenticated users" ON customers FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all for authenticated users" ON inventory FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all for authenticated users" ON system_settings FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all for authenticated users" ON external_visits FOR ALL USING (auth.uid() IS NOT NULL);
