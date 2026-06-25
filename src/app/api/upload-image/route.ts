import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN
    || process.env.BLOB_STORE_ID
    || "";
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  if (!blobToken()) {
    return NextResponse.json({ error: "Blob storage not configured" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }

    const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: file.type,
      token: blobToken(),
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[api/upload-image]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
