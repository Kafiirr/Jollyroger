import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json();

    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim();
    const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();

    if (accountId && accessKeyId && secretAccessKey && bucketName) {
      const ext = (filename || "avatar.jpg").split(".").pop() || "jpg";
      const key = `avatars/${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;

      const host = `${accountId}.r2.cloudflarestorage.com`;
      const region = "auto";
      const service = "s3";
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
      const dateStamp = amzDate.slice(0, 8);

      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
      const canonicalQueryParams = [
        `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
        `X-Amz-Credential=${encodeURIComponent(`${accessKeyId}/${credentialScope}`)}`,
        `X-Amz-Date=${amzDate}`,
        `X-Amz-Expires=900`,
        `X-Amz-SignedHeaders=host`,
      ].sort().join("&");

      const requestPath = `/${bucketName}/${key}`;
      const canonicalRequest = `PUT\n${requestPath}\n${canonicalQueryParams}\nhost:${host}\n\nhost\nUNSIGNED-PAYLOAD`;
      const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

      const getSignatureKey = (keyStr: string, dateStr: string, regionStr: string, serviceStr: string) => {
        const kDate = crypto.createHmac("sha256", "AWS4" + keyStr).update(dateStr).digest();
        const kRegion = crypto.createHmac("sha256", kDate).update(regionStr).digest();
        const kService = crypto.createHmac("sha256", kRegion).update(serviceStr).digest();
        return crypto.createHmac("sha256", kService).update("aws4_request").digest();
      };

      const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
      const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

      const uploadUrl = `https://${host}${requestPath}?${canonicalQueryParams}&X-Amz-Signature=${signature}`;
      const publicUrl = publicUrlBase ? `${publicUrlBase.replace(/\/$/, "")}/${key}` : `https://${host}${requestPath}`;

      return NextResponse.json({ mode: "r2", uploadUrl, publicUrl, key });
    }

    return NextResponse.json({
      mode: "fallback",
      message: "R2 credentials not detected in server environment process.",
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed generating presigned URL" }, { status: 500 });
  }
}
