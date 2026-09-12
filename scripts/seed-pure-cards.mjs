import { createClient } from "@supabase/supabase-js";
import path from "path";

const envPath = path.resolve(".env.local");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}
const env = fs.readFileSync(envPath, "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)?.[1]?.trim() || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)[1].trim();
const supabase = createClient(url, key);

async function seed() {
  const wallet = "0x710e86fa6d521934864a10c2b1f5a03c3221ac02";
  console.log("Seeding pure cards for wallet:", wallet);

  const cards = [
    {
      name: "Boa Hancock OP07-051 Parallel Manga Alternate Art",
      grade: "PSA 10 Gem Mint",
      franchise: "One Piece TCG",
      image_url: "/cards/boa-hancock-manga.png",
      acquired_at: "2026.09.12",
      origin: "onchain",
      token_id: "ctc_vault_99170507",
      room_id: wallet,
      wallet_address: wallet,
    },
    {
      name: "Monkey D. Luffy OP05-119 Manga Alternate Art",
      grade: "PSA 10 Gem Mint",
      franchise: "One Piece TCG",
      image_url: "/cards/luffy-gear5-manga.png",
      acquired_at: "2026.09.12",
      origin: "onchain",
      token_id: "ctc_vault_92799146",
      room_id: wallet,
      wallet_address: wallet,
    },
    {
      name: "Nami OP01-016 Parallel Special Alternate Art",
      grade: "PSA 10 Gem Mint",
      franchise: "One Piece TCG",
      image_url: "/cards/nami-op01-sp.png",
      acquired_at: "2026.09.12",
      origin: "onchain",
      token_id: "ctc_vault_83910245",
      room_id: wallet,
      wallet_address: wallet,
    },
  ];

  for (const c of cards) {
    const { error } = await supabase.from("showcase_cards").insert(c);
    if (error) console.error("Insert error for", c.name, error);
    else console.log("Inserted pure card:", c.name);
  }

  const { data } = await supabase.from("showcase_cards").select("name, image_url").eq("wallet_address", wallet);
  console.log("\nCabinet cards now:", data);
}

seed().catch(console.error);
