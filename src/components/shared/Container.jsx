import { cn } from "@/lib/utils";

const widths = { narrow: "max-w-[45em]", content: "max-w-[75em]", wide: "max-w-[90em]" };

export default function Container({ size = "content", className, children, as: Tag = "div" }) {
  return <Tag className={cn("mx-auto w-full px-[1.25em] md:px-[2em]", widths[size], className)}>{children}</Tag>;
}
