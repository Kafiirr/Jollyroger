const fs = require("fs");
const path = require("path");

// Load .env.local variables
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, "utf-8");
  envText.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://psfniarwfjslxpwletcz.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Service Role Key present:", !!serviceRoleKey);

const SQL = `
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id TEXT PRIMARY KEY,
    username TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.showcase_cards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    room_id TEXT NOT NULL,
    wallet_address TEXT,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    franchise TEXT,
    image_url TEXT,
    acquired_at TEXT NOT NULL,
    origin TEXT DEFAULT 'physical',
    token_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.guestbook (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestbook ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select user_profiles') THEN
        CREATE POLICY "Allow public select user_profiles" ON public.user_profiles FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert user_profiles') THEN
        CREATE POLICY "Allow public insert user_profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update user_profiles') THEN
        CREATE POLICY "Allow public update user_profiles" ON public.user_profiles FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select showcase_cards') THEN
        CREATE POLICY "Allow public select showcase_cards" ON public.showcase_cards FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert showcase_cards') THEN
        CREATE POLICY "Allow public insert showcase_cards" ON public.showcase_cards FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update showcase_cards') THEN
        CREATE POLICY "Allow public update showcase_cards" ON public.showcase_cards FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public delete showcase_cards') THEN
        CREATE POLICY "Allow public delete showcase_cards" ON public.showcase_cards FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select guestbook') THEN
        CREATE POLICY "Allow public select guestbook" ON public.guestbook FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert guestbook') THEN
        CREATE POLICY "Allow public insert guestbook" ON public.guestbook FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update guestbook') THEN
        CREATE POLICY "Allow public update guestbook" ON public.guestbook FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public delete guestbook') THEN
        CREATE POLICY "Allow public delete guestbook" ON public.guestbook FOR DELETE USING (true);
    END IF;
END $$;
`;

async function runMigration() {
  const ref = "psfniarwfjslxpwletcz";
  const endpoints = [
    `https://api.supabase.com/v1/projects/${ref}/query`,
    `${supabaseUrl}/pg/v1/query`,
    `${supabaseUrl}/rest/v1/query`,
  ];

  let success = false;
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}...`);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
        },
        body: JSON.stringify({ query: SQL }),
      });
      if (res.ok) {
        console.log("✅ SQL Migration succeeded via endpoint!");
        success = true;
        break;
      } else {
        const text = await res.text();
        console.log(`Endpoint returned ${res.status}: ${text}`);
      }
    } catch (e) {
      console.log(`Endpoint failed: ${e.message}`);
    }
  }

  // Check tables status with @supabase/supabase-js client
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  console.log("\nVerifying table status on Supabase DB:");
  const tables = ["user_profiles", "showcase_cards", "guestbook"];
  for (const tbl of tables) {
    const { data, error } = await supabase.from(tbl).select("*").limit(1);
    if (error) {
      console.log(`❌ Table '${tbl}': ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ Table '${tbl}': READY (0 errors)`);
    }
  }
}

runMigration();
