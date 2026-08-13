import { cn } from "@/lib/utils";

/** Minimal campfire mark — logs + three soft flames */
export function CampfireMark({ className, size = 64 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <ellipse cx="32" cy="54" rx="18" ry="4" fill="currentColor" className="text-bg-muted" opacity="0.6" />
      <path
        d="M18 46c4-2 10-3 14-3s10 1 14 3l-4 6H22l-4-6z"
        className="fill-bg-muted stroke-border-strong"
        strokeWidth="1"
      />
      <path d="M22 48l-6 4 4 2 6-4-4-2z" className="fill-fg-subtle" opacity="0.5" />
      <path d="M42 48l6 4-4 2-6-4 4-2z" className="fill-fg-subtle" opacity="0.5" />
      <path
        className="flame fill-ember-soft"
        d="M32 12c-2 8-10 12-10 22 0 6 4 10 10 10s10-4 10-10c0-10-8-14-10-22z"
        opacity="0.9"
      />
      <path
        className="flame flame-delay-1 fill-ember"
        d="M32 18c-1.5 6-7 9-7 16 0 4 3 7 7 7s7-3 7-7c0-7-5.5-10-7-16z"
      />
      <path
        className="flame flame-delay-2 fill-ember-glow"
        d="M32 26c-1 4-4 6-4 10 0 2.5 1.8 4.5 4 4.5s4-2 4-4.5c0-4-3-6-4-10z"
      />
    </svg>
  );
}
