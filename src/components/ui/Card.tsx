import { type HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-sm shadow-lg",
        className,
      )}
      {...rest}
    />
  );
}
