import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync("/home/kafir/renaiss/.env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)?.[1]?.trim() || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)[1].trim();
const supabase = createClient(url, key);

async function main() {
  console.log("Updating existing cards with real One Piece card art...");

  // 1. Update Shanks
  const { error: err1 } = await supabase
    .from("showcase_cards")
    .update({ image_url: "/cards/shanks-manga.png" })
    .ilike("name", "%shanks%");
  if (err1) console.error("Error updating Shanks:", err1);
  else console.log("Updated Shanks to /cards/shanks-manga.png");

  // 2. Update Luffy
  const { error: err2 } = await supabase
    .from("showcase_cards")
    .update({ image_url: "/cards/luffy-gear5-manga.png" })
    .ilike("name", "%luffy%");
  if (err2) console.error("Error updating Luffy:", err2);
  else console.log("Updated Luffy to /cards/luffy-gear5-manga.png");

  // 3. Check if user already has Nami, if not add Nami
  const wallet = "0x710e86fa6d521934864a10c2b1f5a03c3221ac02";
  const { data: existingNami } = await supabase
    .from("showcase_cards")
    .select("id")
    .eq("wallet_address", wallet)
    .ilike("name", "%nami%");

  if (!existingNami || existingNami.length === 0) {
    const { error: errNami } = await supabase.from("showcase_cards").insert({
      name: "Nami OP01-016 Parallel Special Alternate Art",
      grade: "PSA 10",
      franchise: "One Piece TCG",
      image_url: "/cards/nami-op01-sp.png",
      acquired_at: new Date().toISOString().slice(0, 10),
      origin: "onchain",
      token_id: "ctc_op01_nami_83910245",
      room_id: wallet,
      wallet_address: wallet,
    });
    if (errNami) console.error("Error adding Nami:", errNami);
    else console.log("Added Nami OP01-016 to cabinet!");
  }

  // 4. Print updated cards
  const { data: cards } = await supabase.from("showcase_cards").select("id, name, image_url, wallet_address").eq("wallet_address", wallet);
  console.log("User cards now in cabinet:", cards);
}

main().catch(console.error);
