export async function uploadAvatarDirectToR2(file: File): Promise<string> {
  // 1. Try direct presigned client PUT to Cloudflare R2
  try {
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (presignRes.ok) {
      const data = await presignRes.json();
      if (data.mode === "r2" && data.uploadUrl) {
        try {
          const clientPutRes = await fetch(data.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });

          if (clientPutRes.ok) {
            console.log("Uploaded avatar directly to Cloudflare R2 via client PUT:", data.publicUrl);
            return data.publicUrl;
          }
        } catch (corsErr) {
          console.warn("Client presigned PUT blocked by CORS; trying server R2 route...", corsErr);
        }
      }
    }
  } catch (err) {
    console.warn("Presigned URL error:", err);
  }

  // 2. Fallback to server R2 upload route (/api/upload/r2) if CORS or presigning failed
  try {
    const formData = new FormData();
    formData.append("file", file);

    const r2ServerRes = await fetch("/api/upload/r2", {
      method: "POST",
      body: formData,
    });

    if (r2ServerRes.ok) {
      const data = await r2ServerRes.json();
      if (data.publicUrl) {
        console.log("Uploaded avatar to Cloudflare R2 via R2 endpoint:", data.publicUrl);
        return data.publicUrl;
      }
    } else {
      const errJson = await r2ServerRes.json();
      console.warn("Server R2 endpoint error:", errJson);
    }
  } catch (err) {
    console.warn("Server R2 upload error:", err);
  }

  // 3. Client-side Data URL conversion fallback if R2 credentials are not set
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
