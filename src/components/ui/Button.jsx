"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-primary text-primary-fg shadow-xs hover:bg-primary-hover",
  secondary: "bg-surface text-fg border border-border-strong shadow-xs hover:bg-surface-hover",
  soft: "bg-primary-soft text-link hover:brightness-95",
  ghost: "bg-transparent text-fg-secondary hover:bg-surface-hover hover:text-fg",
  danger: "bg-surface text-danger-fg border border-danger/40 hover:bg-danger-bg",
  "danger-solid": "bg-danger text-white hover:brightness-95",
  inverse: "bg-pine-100 text-pine-900 hover:bg-white",
};

const sizes = {
  sm: "h-[2em] px-[0.75em] text-[0.8125em] gap-[0.4em] rounded-sm",
  md: "h-[2.5em] px-[1em] text-[0.875em] gap-[0.5em] rounded-md",
  lg: "h-[3em] px-[1.5em] text-[0.9375em] gap-[0.55em] rounded-md font-semibold",
  icon: "h-[2.25em] w-[2.25em] text-[0.875em] rounded-md justify-center",
};

/** AppButton — every button and button-styled link in the product goes through here. */
export default function Button({
  variant = "primary",
  size = "md",
  href,
  loading = false,
  icon: Icon,
  iconEnd: IconEnd,
  className,
  children,
  disabled,
  type = "button",
  ...props
}) {
  const classes = cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium",
    "transition-[transform,background-color,color,border-color,filter] duration-150 ease-out-soft",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );
  const content = (
    <>
      {loading ? <Loader2 className="size-[1.1em] animate-spin" aria-hidden /> : Icon && <Icon className="size-[1.1em]" aria-hidden strokeWidth={1.75} />}
      {children}
      {IconEnd && !loading && <IconEnd className="size-[1.1em]" aria-hidden strokeWidth={1.75} />}
    </>
  );

  if (href) {
    const external = /^(https?:|mailto:|tel:|#)/.test(href);
    return external ? (
      <a href={href} className={classes} aria-disabled={disabled || undefined} {...props}>
        {content}
      </a>
    ) : (
      <Link href={href} className={classes} aria-disabled={disabled || undefined} {...props}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
