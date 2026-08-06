const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Try loading .env.local if present
const envLocalPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = fs.readFileSync(envLocalPath, "utf8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://psfniarwfjslxpwletcz.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.log("❌ SUPABASE_SERVICE_ROLE_KEY is missing in .env.local");
  console.log("Add SUPABASE_SERVICE_ROLE_KEY=your_secret_key in .env.local to automate database table creation.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

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

CREATE TABLE IF NOT EXISTS public.unclaimed_rewards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    wallet_address TEXT NOT NULL,
    score INTEGER NOT NULL,
    card_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
`;

async function execute() {
  console.log("Executing automatic table creation on Supabase...");
  const { error } = await supabase.rpc("exec_sql", { query: SQL });
  if (error) {
    console.error("Migration error:", error.message);
  } else {
    console.log("✅ All tables created successfully!");
  }
}

execute();
