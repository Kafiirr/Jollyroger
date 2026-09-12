import { NextRequest, NextResponse } from "next/server";
import { getDynamicRenaissCards } from "@/lib/api/renaiss";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") || "ONE_PIECE") as "ONE_PIECE" | "POKEMON";
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "30", 10)), 60);

  try {
    const cards = await getDynamicRenaissCards({ category, limit });
    return NextResponse.json({ cards, count: cards.length, source: "renaiss-api" });
  } catch (err: any) {
    return NextResponse.json({ cards: [], error: err?.message || "Failed to fetch Renaiss cards" }, { status: 500 });
  }
}
