import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-forest text-white hover:bg-ink disabled:bg-surface-raised disabled:text-secondary",
    secondary: "bg-lime text-ink hover:bg-[#A9CE5D] disabled:bg-surface-raised disabled:text-secondary",
    ghost: "text-secondary hover:bg-surface-raised hover:text-ink",
    outline: "border border-default bg-surface text-ink hover:border-focus hover:text-forest disabled:bg-surface-raised",
  };
  return <button className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-bold transition disabled:cursor-not-allowed", variants[variant], className)} {...props} />;
}
