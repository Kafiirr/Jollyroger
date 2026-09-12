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
const { data, error } = await supabase.from("showcase_cards").select("id, name, image_url, wallet_address, room_id");
if (error) {
  console.error("Error:", error);
} else {
  console.log("Cards count:", data.length);
  console.log(data);
}
