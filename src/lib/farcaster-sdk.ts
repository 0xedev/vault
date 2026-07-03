import { quickAuth, sdk } from "@farcaster/miniapp-sdk";
import { logClientError } from "./client-log";

let _isMiniApp: boolean | null = null;

export async function isMiniApp(): Promise<boolean> {
  if (_isMiniApp !== null) return _isMiniApp;
  try {
    _isMiniApp = await sdk.isInMiniApp();
  } catch (err) {
    logClientError("farcaster-sdk:isMiniApp", err);
    _isMiniApp = false;
  }
  return _isMiniApp;
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

export async function signInWithFarcaster(options: { force?: boolean } = {}) {
  try {
    const inMiniApp = await isMiniApp();
    if (!inMiniApp) {
      logClientError("farcaster-sdk:signInWithFarcaster:not-miniapp", "isMiniApp returned false, aborting sign-in");
      return null;
    }

    const result = await quickAuth.getToken({
      force: options.force ? "true" : undefined,
    });
    if (!result?.token) {
      logClientError("farcaster-sdk:signInWithFarcaster:no-token", "quickAuth.getToken returned no token", { hasResult: !!result, force: !!options.force });
      return null;
    }

    return result;
  } catch (err) {
    logClientError("farcaster-sdk:signInWithFarcaster:exception", err, { force: !!options.force });
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
