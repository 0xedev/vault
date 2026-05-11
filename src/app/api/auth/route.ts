import { NextRequest, NextResponse } from "next/server";
import { SiweMessage, generateNonce } from "siwe";

export async function GET() {
  return NextResponse.json({ nonce: generateNonce() });
}

export async function POST(req: NextRequest) {
  try {
    const { message, signature } = await req.json();

    const siweMessage = new SiweMessage(message);
    const { success, data } = await siweMessage.verify({ signature });

    if (!success) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    return NextResponse.json({
      address: data.address,
      chainId: data.chainId,
    });
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
}
