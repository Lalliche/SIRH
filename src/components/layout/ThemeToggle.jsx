"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme";

export function ThemeToggle({ className }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? "Passer au thème clair" : "Passer au thème sombre"} aria-pressed={dark} title={dark ? "Thème clair" : "Thème sombre"} className={cn("max-md:size-[2.6em]", className)}>
      {dark ? <Sun className="size-[1.25em]" strokeWidth={1.6} /> : <Moon className="size-[1.25em]" strokeWidth={1.6} />}
    </Button>
  );
}
