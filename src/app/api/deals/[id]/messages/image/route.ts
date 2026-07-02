import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { badRequest } from "@/lib/api";
import { actorAddressForRequest, requireUser } from "@/lib/auth";
import { blobObjectKey } from "@/lib/upload-keys";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: escrowId } = await params;
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const url = new URL(req.url);
  const actorAddress = actorAddressForRequest(auth.user, url.searchParams.get("walletAddress"));

  const escrowRows = await auth.db`
    SELECT id FROM escrows
    WHERE id = ${escrowId}
      AND (buyer_address = ${actorAddress} OR seller_address = ${actorAddress})
    LIMIT 1
  ` as Record<string, unknown>[];
  if (escrowRows.length === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File;
  if (!file) return badRequest("No file uploaded");

  if (!file.type.startsWith("image/")) return badRequest("Only image files are allowed");
  if (file.size > 10 * 1024 * 1024) return badRequest("Max file size is 10MB");

  const blob = await put(
    blobObjectKey(`deals/${escrowId}`, file.type),
    file,
    { access: "public", contentType: file.type }
  );

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
