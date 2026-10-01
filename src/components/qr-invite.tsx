import { useEffect, useState } from "react";
import { qrDataUrl } from "@/lib/qr";
import { cn } from "@/lib/utils";

export function QrInvite({
  url,
  className,
  label = "Scan to join",
}: {
  url: string;
  className?: string;
  label?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!url || !url.startsWith("http")) {
      setSrc(null);
      return;
    }
    void qrDataUrl(url, { width: 200 }).then((data) => {
      if (!cancelled) setSrc(data);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!src) return null;

  return (
    <figure
      className={cn(
        "flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-bg-subtle/80 p-3",
        className,
      )}
    >
      <img
        src={src}
        alt={`QR code for ${url}`}
        width={160}
        height={160}
        className="size-40 rounded-[var(--radius-sm)]"
      />
      <figcaption className="text-center text-[11px] uppercase tracking-wider text-fg-subtle">
        {label}
      </figcaption>
    </figure>
  );
}
