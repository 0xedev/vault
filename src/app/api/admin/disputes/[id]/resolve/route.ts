import { NextRequest } from "next/server";
import { resolveDispute } from "@/lib/escrow-actions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return resolveDispute(req, id);
}
