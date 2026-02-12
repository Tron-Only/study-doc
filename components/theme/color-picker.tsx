"use client";

import { RgbaColorPicker } from "react-colorful";
import { useTheme, DEFAULT_PRESETS } from "./theme-provider";
import { Check } from "lucide-react";

interface ColorPickerProps {
  className?: string;
}

// Convert hex to rgba object for the picker
function hexToRgba(hex: string, alpha: number = 1) {
  // Remove # if present
  const cleanHex = hex.replace("#", "");
  
  // Handle both 3-digit and 6-digit hex
  let r, g, b;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else {
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
  }
  
  return { r, g, b, a: alpha };
}

// Convert rgba object to hex string (without alpha)
function rgbaToHex(rgba: { r: number; g: number; b: number }) {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.padStart(2, "0");
  };
  return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
}

export function ColorPicker({ className }: ColorPickerProps) {
  const {
    accentColor,
    setAccentColor,
    accentType,
    setAccentType,
    transparency,
    setTransparency,
  } = useTheme();

  // Convert current color to RGBA format for the picker
  const currentRgba = hexToRgba(accentColor, transparency / 100);

  // Handle color change from picker
  const handleColorChange = (rgba: { r: number; g: number; b: number; a: number }) => {
    // Update the hex color (without alpha)
    const hex = rgbaToHex(rgba);
    setAccentColor(hex);
    
    // Update transparency separately
    const alphaPercent = Math.max(0, Math.min(100, Math.round(rgba.a * 100)));
    setTransparency(alphaPercent);
    
    // Mark as custom color
    setAccentType("custom");
  };

  // Handle preset color click
  const handlePresetClick = (color: string) => {
    setAccentColor(color);
    setTransparency(100);
    setAccentType("preset");
  };

  // Check if a preset is selected
  const isPresetSelected = (presetColor: string) => {
    return accentColor.toLowerCase() === presetColor.toLowerCase() && 
           transparency === 100 && 
           accentType === "preset";
  };

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Color Picker with Alpha */}
      <div className="flex justify-center">
        <div className="color-picker-container w-full max-w-[240px]">
          <RgbaColorPicker
            color={currentRgba}
            onChange={handleColorChange}
            style={{
              width: "100%",
              height: "200px",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          />
        </div>
      </div>

      {/* Preset Colors */}
      <div className="flex justify-center gap-2 flex-wrap">
        {DEFAULT_PRESETS.map((color) => (
          <button
            key={color}
            onClick={() => handlePresetClick(color)}
            className="w-8 h-8 rounded-full border-2 transition-all duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
            style={{
              backgroundColor: color,
              borderColor: isPresetSelected(color)
                ? "var(--foreground)"
                : "transparent",
              boxShadow: isPresetSelected(color)
                ? `0 0 0 2px ${color}`
                : "none",
            }}
            aria-label={`Select ${color} color`}
          >
            {isPresetSelected(color) && (
              <Check className="w-4 h-4 mx-auto text-white drop-shadow-md" />
            )}
          </button>
        ))}
      </div>

      {/* Color Info */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <div
          className="w-4 h-4 rounded border"
          style={{ 
            backgroundColor: accentColor,
            opacity: transparency / 100,
          }}
        />
        <span className="font-mono uppercase">{accentColor}</span>
        <span className="text-xs text-muted-foreground">
          ({transparency}% opacity)
        </span>
      </div>
    </div>
  );
}
