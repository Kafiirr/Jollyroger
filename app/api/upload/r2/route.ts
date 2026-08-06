import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim();
    const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return NextResponse.json({ error: "R2 credentials missing in .env.local" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name || "avatar.jpg").split(".").pop() || "jpg";
    const key = `avatars/${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;

    const host = `${accountId}.r2.cloudflarestorage.com`;
    const region = "auto";
    const service = "s3";
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    const canonicalHeaders = `content-type:${file.type}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

    const requestPath = `/${bucketName}/${key}`;
    const canonicalRequest = `PUT\n${requestPath}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

    const getSignatureKey = (keyStr: string, dateStr: string, regionStr: string, serviceStr: string) => {
      const kDate = crypto.createHmac("sha256", "AWS4" + keyStr).update(dateStr).digest();
      const kRegion = crypto.createHmac("sha256", kDate).update(regionStr).digest();
      const kService = crypto.createHmac("sha256", kRegion).update(serviceStr).digest();
      return crypto.createHmac("sha256", kService).update("aws4_request").digest();
    };

    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const r2Res = await fetch(`https://${host}${requestPath}`, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "Host": host,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        "Authorization": authHeader,
      },
      body: buffer,
    });

    if (!r2Res.ok) {
      const errText = await r2Res.text();
      return NextResponse.json({ error: `R2 put failed: ${r2Res.status} ${errText}` }, { status: 500 });
    }

    const publicUrl = publicUrlBase ? `${publicUrlBase.replace(/\/$/, "")}/${key}` : `https://${host}${requestPath}`;
    return NextResponse.json({ success: true, publicUrl, key });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed uploading to R2" }, { status: 500 });
  }
}
