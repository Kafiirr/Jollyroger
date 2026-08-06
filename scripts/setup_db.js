const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://psfniarwfjslxpwletcz.supabase.co";
const supabaseAnonKey = "sb_publishable_24AvJoftM4bzEDC2t5gghg_tjtGN4pH";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log("Checking Supabase tables for project:", supabaseUrl);

  const tables = ["user_profiles", "showcase_cards", "guestbook"];
  for (const tbl of tables) {
    const { data, error } = await supabase.from(tbl).select("*").limit(1);
    if (error) {
      console.log(`❌ Table '${tbl}': ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ Table '${tbl}': OK (Found ${data ? data.length : 0} rows)`);
    }
  }
}

checkTables();
