import { useEffect, useRef } from "react";
import type { AtmosphereTheme } from "@/lib/game/types";
import { FLAME_PALETTES } from "@/lib/immersion/themes";
import { cn } from "@/lib/utils";

type Ember = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
};

type Star = { x: number; y: number; r: number; a: number; tw: number };

/**
 * Canvas campfire: flames, glow, rising embers.
 * `pulse` increments when a word is added for a gentle flare.
 */
export function CampfireScene({
  theme,
  pulse = 0,
  reducedMotion = false,
  className,
  compact = false,
}: {
  theme: AtmosphereTheme;
  pulse?: number;
  reducedMotion?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulseRef = useRef(0);
  const targetPulse = useRef(0);

  useEffect(() => {
    targetPulse.current = Math.min(1, targetPulse.current + 0.85);
  }, [pulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = FLAME_PALETTES[theme];
    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const embers: Ember[] = [];
    const stars: Star[] = [];
    let t0 = performance.now();

    function resize() {
      const parent = canvas!.parentElement;
      const rect = parent?.getBoundingClientRect() ?? canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars.length = 0;
      if (theme === "space" || theme === "night" || theme === "forest") {
        const count = theme === "space" ? 48 : 18;
        for (let i = 0; i < count; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h * 0.55,
            r: Math.random() * 1.2 + 0.3,
            a: Math.random() * 0.6 + 0.2,
            tw: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    function spawnEmber(boost = 0) {
      const cx = w * 0.5;
      const baseY = h * (compact ? 0.72 : 0.78);
      embers.push({
        x: cx + (Math.random() - 0.5) * w * 0.12,
        y: baseY - Math.random() * 12,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -(0.4 + Math.random() * 0.9 + boost),
        life: 0,
        max: 50 + Math.random() * 70,
        size: 1 + Math.random() * 2.2,
      });
    }

    function drawFlameBlob(
      cx: number,
      cy: number,
      rw: number,
      rh: number,
      color: string,
      wobble: number,
      phase: number,
    ) {
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.scale(1 + Math.sin(phase) * 0.04, 1 + Math.cos(phase * 1.3) * 0.06);
      const g = ctx!.createRadialGradient(0, -rh * 0.2, 0, 0, 0, rh);
      g.addColorStop(0, color);
      g.addColorStop(0.55, color);
      g.addColorStop(1, "transparent");
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.moveTo(0, -rh);
      ctx!.bezierCurveTo(rw + wobble, -rh * 0.4, rw * 0.9, rh * 0.2, 0, rh * 0.35);
      ctx!.bezierCurveTo(-rw * 0.9, rh * 0.2, -rw - wobble, -rh * 0.4, 0, -rh);
      ctx!.fill();
      ctx!.restore();
    }

    function frame(now: number) {
      const t = (now - t0) / 1000;
      pulseRef.current += (targetPulse.current - pulseRef.current) * 0.08;
      targetPulse.current *= 0.96;

      ctx!.clearRect(0, 0, w, h);

      // Atmosphere wash
      if (theme === "space") {
        const sky = ctx!.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "rgba(20, 24, 48, 0.5)");
        sky.addColorStop(1, "transparent");
        ctx!.fillStyle = sky;
        ctx!.fillRect(0, 0, w, h);
      } else if (theme === "forest") {
        const sky = ctx!.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "rgba(20, 40, 28, 0.35)");
        sky.addColorStop(1, "transparent");
        ctx!.fillStyle = sky;
        ctx!.fillRect(0, 0, w, h);
      } else if (theme === "cabin") {
        const sky = ctx!.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "rgba(40, 24, 12, 0.25)");
        sky.addColorStop(1, "transparent");
        ctx!.fillStyle = sky;
        ctx!.fillRect(0, 0, w, h);
      }

      // Stars
      for (const s of stars) {
        const tw = reducedMotion ? s.a : s.a * (0.65 + 0.35 * Math.sin(t * 1.5 + s.tw));
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(255,255,255,${tw})`;
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      const cx = w * 0.5;
      const baseY = h * (compact ? 0.78 : 0.82);
      const boost = pulseRef.current;
      const flameH = (compact ? h * 0.42 : h * 0.48) * (1 + boost * 0.25);
      const flameW = (compact ? w * 0.14 : w * 0.12) * (1 + boost * 0.15);

      // Ground glow
      const glowR = (compact ? w * 0.35 : w * 0.42) * (1 + boost * 0.2);
      const glow = ctx!.createRadialGradient(cx, baseY, 0, cx, baseY, glowR);
      glow.addColorStop(0, palette.glow);
      glow.addColorStop(0.45, palette.glow.replace(/[\d.]+\)$/, "0.12)"));
      glow.addColorStop(1, "transparent");
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, w, h);

      // Logs
      ctx!.fillStyle = palette.log;
      ctx!.save();
      ctx!.translate(cx, baseY);
      ctx!.rotate(-0.25);
      ctx!.fillRect(-w * 0.12, -4, w * 0.24, 8);
      ctx!.rotate(0.5);
      ctx!.fillRect(-w * 0.12, -4, w * 0.24, 8);
      ctx!.restore();

      if (reducedMotion) {
        drawFlameBlob(cx, baseY - flameH * 0.35, flameW * 1.1, flameH * 0.7, palette.outer, 0, 0);
        drawFlameBlob(cx, baseY - flameH * 0.4, flameW * 0.75, flameH * 0.6, palette.mid, 0, 0);
        drawFlameBlob(cx, baseY - flameH * 0.42, flameW * 0.4, flameH * 0.45, palette.core, 0, 0);
      } else {
        const phase = t * 3;
        drawFlameBlob(
          cx,
          baseY - flameH * 0.35,
          flameW * 1.15,
          flameH * 0.75,
          palette.outer,
          Math.sin(phase) * 6,
          phase,
        );
        drawFlameBlob(
          cx - 4,
          baseY - flameH * 0.4,
          flameW * 0.8,
          flameH * 0.62,
          palette.mid,
          Math.sin(phase + 1) * 5,
          phase + 0.7,
        );
        drawFlameBlob(
          cx + 2,
          baseY - flameH * 0.45,
          flameW * 0.45,
          flameH * 0.48,
          palette.core,
          Math.sin(phase + 2) * 3,
          phase + 1.4,
        );
      }

      // Embers
      if (!reducedMotion) {
        const spawnRate = 0.15 + boost * 0.55;
        if (Math.random() < spawnRate) spawnEmber(boost);
        if (boost > 0.4 && Math.random() < 0.4) spawnEmber(boost);
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]!;
        e.life++;
        e.x += e.vx + Math.sin(t * 2 + e.y) * 0.15;
        e.y += e.vy;
        e.vy *= 0.995;
        const age = e.life / e.max;
        if (age >= 1) {
          embers.splice(i, 1);
          continue;
        }
        ctx!.beginPath();
        ctx!.fillStyle = palette.ember;
        ctx!.globalAlpha = (1 - age) * 0.9;
        ctx!.arc(e.x, e.y, e.size * (1 - age * 0.5), 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [theme, reducedMotion, compact]);

  return (
    <div className={cn("pointer-events-none relative overflow-hidden", className)} aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
