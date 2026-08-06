import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Profile API — looks up username & avatar by wallet address from Supabase user_profiles.
 * GET /api/profile?wallet=0xABC...
 */
export const revalidate = 60;

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get("wallet")?.trim().toLowerCase();
  if (!wallet) return NextResponse.json({ avatarUrl: "", username: "" }, { status: 400 });

  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("username, avatar_url")
      .eq("id", wallet)
      .single();

    if (data) {
      return NextResponse.json({
        avatarUrl: data.avatar_url ?? "",
        username: data.username ?? "",
      });
    }
    // No profile found — return truncated address as fallback
    const short = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
    return NextResponse.json({ avatarUrl: "", username: short });
  } catch {
    return NextResponse.json({ avatarUrl: "", username: "" });
  }
}
