"use client";

import { useTheme } from "./theme-provider";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function TransparencyControls() {
  const { transparency, setTransparency } = useTheme();

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <Label htmlFor="transparency">Card Transparency</Label>
        <span className="text-muted-foreground">{transparency}%</span>
      </div>
      <Slider
        id="transparency"
        value={[transparency]}
        onValueChange={(value: number[]) => setTransparency(value[0])}
        min={50}
        max={100}
        step={5}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground">
        Adjust the opacity of cards and panels
      </p>
    </div>
  );
}
