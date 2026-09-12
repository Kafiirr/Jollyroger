import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync("/home/kafir/renaiss/.env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)?.[1]?.trim() || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)[1].trim();
const supabase = createClient(url, key);

async function cleanCards() {
  console.log("Cleaning showcase_cards table...");
  
  // 1. Update Boa Hancock
  const { data: hancock } = await supabase
    .from("showcase_cards")
    .update({ image_url: "/cards/boa-hancock-manga.png" })
    .ilike("name", "%hancock%")
    .select();
  console.log("Updated Hancock:", hancock?.length);

  // 2. Update Luffy
  const { data: luffy } = await supabase
    .from("showcase_cards")
    .update({ image_url: "/cards/luffy-gear5-manga.png" })
    .ilike("name", "%luffy%")
    .select();
  console.log("Updated Luffy:", luffy?.length);

  // 3. Update Shanks
  const { data: shanks } = await supabase
    .from("showcase_cards")
    .update({ image_url: "/cards/shanks-manga.png" })
    .ilike("name", "%shanks%")
    .select();
  console.log("Updated Shanks:", shanks?.length);

  // 4. Update Nami
  const { data: nami } = await supabase
    .from("showcase_cards")
    .update({ image_url: "/cards/nami-op01-sp.png" })
    .ilike("name", "%nami%")
    .select();
  console.log("Updated Nami:", nami?.length);

  // 5. Update Zoro
  const { data: zoro } = await supabase
    .from("showcase_cards")
    .update({ image_url: "/cards/zoro-manga.png" })
    .ilike("name", "%zoro%")
    .select();
  console.log("Updated Zoro:", zoro?.length);

  // Print all cards now
  const { data: all } = await supabase.from("showcase_cards").select("id, name, image_url, wallet_address");
  console.log("\nAll cards in DB now:", all);
}

cleanCards().catch(console.error);
