"use client";

import { useTheme } from "./theme-provider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function GrainControls() {
  const {
    grainEnabled,
    setGrainEnabled,
    grainIntensity,
    setGrainIntensity,
  } = useTheme();

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="grain-toggle" className="text-sm font-medium">
            Grain Effect
          </Label>
          <p className="text-xs text-muted-foreground">
            Add subtle texture to the background
          </p>
        </div>
        <Switch
          id="grain-toggle"
          checked={grainEnabled}
          onCheckedChange={setGrainEnabled}
        />
      </div>

      {/* Intensity Slider */}
      {grainEnabled && (
        <div className="space-y-2 pl-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Intensity</span>
            <span>{grainIntensity}%</span>
          </div>
          <Slider
            value={[grainIntensity]}
            onValueChange={(value) => setGrainIntensity(value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
