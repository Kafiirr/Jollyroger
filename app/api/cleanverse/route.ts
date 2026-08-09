import { NextResponse } from "next/server";
import { getCleanverseProfile } from "@/lib/api/cleanverse";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address query parameter" }, { status: 400 });
  }

  try {
    const profile = await getCleanverseProfile(address);
    return NextResponse.json(profile);
  } catch (err) {
    console.warn("Cleanverse profile retrieval fallback:", err);
    return NextResponse.json({ error: "Failed to retrieve Cleanverse profile" }, { status: 500 });
  }
}
