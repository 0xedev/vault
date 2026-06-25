import { sdk } from "@farcaster/miniapp-sdk";

let _isMiniApp: boolean | null = null;
let _context: { fid: number; username: string } | null = null;

export async function isMiniApp(): Promise<boolean> {
  if (_isMiniApp !== null) return _isMiniApp;
  try {
    _isMiniApp = await sdk.isInMiniApp();
  } catch {
    _isMiniApp = false;
  }
  return _isMiniApp;
}

export async function getFarcasterContext() {
  if (_context) return _context;
  try {
    const ctx = await sdk.context;
    _context = { fid: ctx?.user?.fid ?? 0, username: ctx?.user?.username ?? "" };
  } catch {
    _context = { fid: 0, username: "" };
  }
  return _context;
}

export async function hideSplash() {
  try {
    if (await isMiniApp()) await sdk.actions.ready();
  } catch {
    // Not in a Mini App context
  }
}

export async function addToFarcaster() {
  try {
    await sdk.actions.addMiniApp();
  } catch {
    // User rejected or invalid domain
  }
}

export async function signInWithFarcaster(nonce: string) {
  try {
    if (!(await isMiniApp())) return null;
    return await sdk.actions.signIn({ nonce, acceptAuthAddress: true });
  } catch (err) {
    console.warn("Farcaster sign-in failed:", err);
    return null;
  }
}

export async function shareAsCast(text: string, embedUrl?: string) {
  try {
    const result = await sdk.actions.composeCast({
      text,
      embeds: embedUrl ? [embedUrl] : undefined,
    });
    return result;
  } catch {
    return null;
  }
}
