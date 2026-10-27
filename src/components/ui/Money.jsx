import { amount, money } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Money({ value, symbol = true, decimals = 2, negative = false, className }) {
  const text = symbol ? money(value, { decimals }) : amount(value, { decimals });
  return <span className={cn("num whitespace-nowrap", className)}>{negative ? `−${text}` : text}</span>;
}
