import { NextResponse } from "next/server";

/**
* PSA    —   .
* PSA Public API (  ,  100):
*  - GET /publicapi/cert/GetByCertNumber/{cert}   →   (PSACert )
*  - GET /publicapi/cert/GetImagesByCertNumber/{cert} →   ( )
*  PSA_API_TOKEN (.env.local / Vercel ).
* ⚠️         —      .
 */

const PSA_BASE = "https://api.psacard.com/publicapi";

interface PsaCertRaw {
  CertNumber?: string;
  Year?: string;
  Brand?: string;
  Category?: string;
  CardNumber?: string;
  Subject?: string;
  Variety?: string;
  CardGrade?: string;
  GradeDescription?: string;
  TotalPopulation?: number;
  PopulationHigher?: number;
}

interface PsaImageRaw {
  IsFrontImage?: boolean;
  ImageURL?: string;
}

export interface PsaLookupDto {
  certNumber: string;
  name: string;
  grade: string;
  franchise: string;
  year?: string;
  imageUrl?: string;
}

async function psaFetch(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${PSA_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 }, //
  });
  if (!res.ok) throw new Error(`PSA API ${res.status}`);
  return res.json();
}

/** "GEM MT 10" / "MINT 9"     "PSA 10"  */
function toGradeLabel(raw: PsaCertRaw): string {
  const src = raw.CardGrade ?? raw.GradeDescription ?? "";
  const m = src.match(/(\d+(?:\.\d+)?)\s*$/);
  return m ? `PSA ${m[1]}` : src ? `PSA ${src}` : "PSA";
}

export async function GET(
  _req: Request,
  { params }: { params: { cert: string } }
) {
  const token = process.env.PSA_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "PSA_API_TOKEN not configured" },
      { status: 501 }
    );
  }

  const cert = params.cert.replace(/\D/g, ""); //
  if (!cert) {
    return NextResponse.json({ error: "invalid cert number" }, { status: 400 });
  }

  try {
    const certData = (await psaFetch(`/cert/GetByCertNumber/${cert}`, token)) as
      | { PSACert?: PsaCertRaw }
      | PsaCertRaw;
    // { PSACert: {...} }
    const c: PsaCertRaw = "PSACert" in certData && certData.PSACert ? certData.PSACert : (certData as PsaCertRaw);
    if (!c.CertNumber && !c.Subject) {
      return NextResponse.json({ error: "cert not found" }, { status: 404 });
    }

    // —  ( )
    let imageUrl: string | undefined;
    try {
      const imgs = (await psaFetch(`/cert/GetImagesByCertNumber/${cert}`, token)) as PsaImageRaw[];
      if (Array.isArray(imgs)) {
        imageUrl = (imgs.find((i) => i.IsFrontImage) ?? imgs[0])?.ImageURL;
      }
    } catch {
      // —
    }

    const dto: PsaLookupDto = {
      certNumber: cert,
      name: [c.Subject, c.Variety].filter(Boolean).join(" · "),
      grade: toGradeLabel(c),
      franchise: c.Brand ?? c.Category ?? "TCG",
      year: c.Year,
      imageUrl,
    };
    return NextResponse.json(dto);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 502 }
    );
  }
}
