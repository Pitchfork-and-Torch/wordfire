/**
 * iOS, including iPadOS, never fires beforeinstallprompt.
 * iPadOS 13+ Safari sends a Macintosh user agent. MacIntel plus a touch
 * point is how that tablet is told apart from a desktop Mac.
 * A touchscreen Mac can match too. The hint is dismissible.
 */
export function isIosInstallTarget(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
): boolean {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return true;
  return platform === "MacIntel" && maxTouchPoints > 1;
}
