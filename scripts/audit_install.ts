/**
 * iOS install-surface detector plus the offline shell lock.
 *   npx --yes tsx scripts/audit_install.ts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isIosInstallTarget } from "../src/lib/pwa/install-surface.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    console.log("ok ", name);
    return;
  }
  failed += 1;
  console.log("FAIL", name, detail);
}

check("iphone", isIosInstallTarget("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", "iPhone", 5));
check("ipad", isIosInstallTarget("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)", "iPad", 5));
check("ipod", isIosInstallTarget("Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)", "iPod", 5));
check(
  "crios",
  isIosInstallTarget("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0.0.0", "iPhone", 5),
);
check("ipados-desktop-ua", isIosInstallTarget("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5));
check("mac-desktop", !isIosInstallTarget("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0));
check("windows", !isIosInstallTarget("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32", 0));
check("android", !isIosInstallTarget("Mozilla/5.0 (Linux; Android 14; Pixel 8)", "Linux armv8l", 5));
check("empty", !isIosInstallTarget("", "", 0));

const sw = readFileSync(join(root, "public", "sw.js"), "utf8");
check("shell-cache", sw.includes('const CACHE = "wordfire-shell-v2"'));
check("precache-touch-icon", sw.includes('"/apple-touch-icon.png"'));
check("precache-manifest", sw.includes('"/manifest.webmanifest"'));

const hint = readFileSync(join(root, "src", "components", "pwa", "install-hint.tsx"), "utf8");
check("share-step", hint.includes("Add to Home Screen"));
check("chromium-still-prompts", hint.includes("deferred.prompt()"));

const version = readFileSync(join(root, "src", "lib", "version.ts"), "utf8");
check("app-version", version.includes('APP_VERSION = "2.3.0"'));

if (failed) {
  console.log(`FAIL ${failed}`);
  process.exit(1);
}
console.log("install audit ok");
