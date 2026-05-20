import { NextRequest } from "next/server";
import { getSessionResponse } from "@/lib/auth";

export async function GET(req: NextRequest) {
  return getSessionResponse(req);
}
