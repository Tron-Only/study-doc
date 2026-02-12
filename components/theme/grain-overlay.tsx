"use client";

import { useTheme } from "./theme-provider";

/**
 * GrainTextureOverlay
 * 
 * Applies a subtle noise/grain texture over the entire page.
 * The intensity is controlled via CSS custom property --grain-opacity.
 * Only visible when data-grain="true" is set on the html element.
 */
export function GrainTextureOverlay() {
  const { grainEnabled, grainIntensity } = useTheme();

  if (!grainEnabled) return null;

  return (
    <div
      className="grain-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 9999,
        opacity: grainIntensity / 100,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }}
    />
  );
}
