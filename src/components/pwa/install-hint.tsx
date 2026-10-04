import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/game/store";
import { isIosInstallTarget } from "@/lib/pwa/install-surface";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallHint() {
  const dismissed = useGameStore((s) => s.settings.immersion?.dismissedInstallHint ?? false);
  const immersion = useGameStore((s) => s.settings.immersion);
  const patchSettings = useGameStore((s) => s.patchSettings);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const mq = window.matchMedia("(display-mode: standalone)");
    setStandalone(mq.matches || nav.standalone === true);
    setIos(isIosInstallTarget(navigator.userAgent, navigator.platform, navigator.maxTouchPoints));
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (standalone || dismissed) return null;
  if (!deferred && !ios) return null;

  const dismiss = () =>
    patchSettings({
      immersion: {
        theme: immersion?.theme ?? "night",
        soundEnabled: immersion?.soundEnabled ?? false,
        soundVolume: immersion?.soundVolume ?? 0.35,
        dismissedInstallHint: true,
      },
    });

  const chromium = deferred != null;

  return (
    <div
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-50 mx-auto max-w-md rounded-[var(--radius-xl)] border border-border bg-bg-elevated/95 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm"
      role="dialog"
      aria-label="Install Wordfire"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-ember/15 text-ember-glow">
          {chromium ? <Download className="size-5" /> : <Share2 className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-fg">Keep the fire close</p>
          {chromium ? (
            <p className="mt-0.5 text-sm text-fg-muted">
              Install Wordfire for offline pass-and-play on this device.
            </p>
          ) : (
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-sm text-fg-muted">
              <li>Tap Share</li>
              <li>Tap Add to Home Screen</li>
            </ol>
          )}
          <div className="mt-3 flex gap-2">
            {chromium ? (
              <Button
                size="sm"
                onClick={async () => {
                  await deferred.prompt();
                  await deferred.userChoice;
                  setDeferred(null);
                }}
              >
                Install
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
