import { NextRequest } from "next/server";
import { addEscrowProof } from "@/lib/escrow-actions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return addEscrowProof(req, id);
}
