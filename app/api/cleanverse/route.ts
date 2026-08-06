import { NextResponse } from "next/server";
import { generateSandboxProfile } from "@/lib/api/cleanverse";

const CLEANVERSE_API_ID = process.env.CLEANVERSE_API_ID || "";
const CLEANVERSE_API_KEY = process.env.CLEANVERSE_API_KEY || "";
const CLEANVERSE_BASE_URL = process.env.CLEANVERSE_BASE_URL || "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address query parameter" }, { status: 400 });
  }

  try {
    // Attempt remote fetch from Cleanverse Sandbox API endpoint
    const response = await fetch(`${CLEANVERSE_BASE_URL}/identity/${address}`, {
      headers: {
        "X-Cleanverse-App-Id": CLEANVERSE_API_ID,
        "X-Cleanverse-Api-Key": CLEANVERSE_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.warn("Cleanverse live API endpoint fallback to sandbox model:", err);
  }

  // Fallback to local sandbox profile generator
  const mockData = generateSandboxProfile(address);
  return NextResponse.json(mockData);
}
