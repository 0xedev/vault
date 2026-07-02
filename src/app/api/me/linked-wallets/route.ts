import { NextRequest } from "next/server";
import {
  linkWalletToFarcasterSession,
  listLinkedWallets,
  unlinkWalletFromFarcasterSession,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  return listLinkedWallets(req);
}

export async function POST(req: NextRequest) {
  return linkWalletToFarcasterSession(req);
}

export async function DELETE(req: NextRequest) {
  return unlinkWalletFromFarcasterSession(req);
}
