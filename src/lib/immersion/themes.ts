import type { AtmosphereTheme } from "@/lib/game/types";

export type FlamePalette = {
  core: string;
  mid: string;
  outer: string;
  ember: string;
  glow: string;
  log: string;
};

export const FLAME_PALETTES: Record<AtmosphereTheme, FlamePalette> = {
  night: {
    core: "#fff2c8",
    mid: "#f0a060",
    outer: "#e07840",
    ember: "#ff6a30",
    glow: "rgba(224, 120, 64, 0.35)",
    log: "#3a2a22",
  },
  forest: {
    core: "#e8f5d8",
    mid: "#a8c878",
    outer: "#6a9a58",
    ember: "#c8a050",
    glow: "rgba(106, 154, 88, 0.3)",
    log: "#2a3228",
  },
  cabin: {
    core: "#fff0d8",
    mid: "#e8a060",
    outer: "#c87040",
    ember: "#d06030",
    glow: "rgba(200, 112, 64, 0.4)",
    log: "#4a3020",
  },
  space: {
    core: "#e8f0ff",
    mid: "#90b0e8",
    outer: "#6080c8",
    ember: "#c0a0ff",
    glow: "rgba(120, 140, 220, 0.35)",
    log: "#1a1c28",
  },
  minimal: {
    core: "#f0f0f0",
    mid: "#c8c8c8",
    outer: "#909090",
    ember: "#d0d0d0",
    glow: "rgba(200, 200, 200, 0.2)",
    log: "#2a2a2a",
  },
};
