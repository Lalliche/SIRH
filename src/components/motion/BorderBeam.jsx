import { cn } from "@/lib/utils";

/**
 * A light that travels once around the border of its (relative, rounded) parent. Pure CSS (see keyframes.jsx),
 * frozen under reduced motion. `color` is any CSS color / token var.
 */
export default function BorderBeam({ color = "var(--pine-300)", className }) {
  return <span aria-hidden className={cn("sirh-beam", className)} style={{ "--beam": color }} />;
}
