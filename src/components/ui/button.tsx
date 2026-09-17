import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-forest text-white hover:bg-ink",
    secondary: "bg-lime text-forest hover:bg-lime/80",
    ghost: "text-ink/60 hover:bg-ink/5 hover:text-ink",
    outline: "border border-ink/15 bg-white text-ink hover:border-forest hover:text-forest",
  };
  return <button className={cn("inline-flex min-h-10 items-center justify-center gap-2 px-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50", variants[variant], className)} {...props} />;
}
