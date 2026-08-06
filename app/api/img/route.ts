import { NextResponse } from "next/server";
import { APITCG_GAMES } from "@/lib/api/apitcgGames";

/**
*   —  (    )    .
* : en.onepiece-cardgame.com  CORP(Cross-Origin-Resource-Policy)
*        (net::ERR_BLOCKED_BY_RESPONSE.NotSameSite) <img>   .
*         same-origin    .
* :  /SSRF     . (?url=    )
 */
// =      (   apitcgGames.ts  )
const ALLOWED_HOSTS = new Set(APITCG_GAMES.flatMap((g) => g.imageHosts));

export const revalidate = 86400; //

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      // Referer  -
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
      next: { revalidate: 86400 },
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "fetch failed" },
      { status: 502 }
    );
  }
}
