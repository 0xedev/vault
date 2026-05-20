import { NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  return destroySession(req);
}
