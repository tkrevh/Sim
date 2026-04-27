"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_18px_-4px_rgba(16,185,129,0.6)]",
  secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700",
  ghost: "bg-transparent hover:bg-zinc-800 text-zinc-200",
  danger: "bg-rose-500 hover:bg-rose-400 text-white",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "secondary", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
