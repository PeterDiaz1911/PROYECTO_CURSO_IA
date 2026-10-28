import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-forest text-white hover:bg-ink disabled:bg-[#E8EEE7] disabled:text-[#526157]",
    secondary: "bg-lime text-ink hover:bg-[#A9CE5D] disabled:bg-[#E8EEE7] disabled:text-[#526157]",
    ghost: "text-[#526157] hover:bg-ink/5 hover:text-ink",
    outline: "border border-ink/15 bg-white text-ink hover:border-forest hover:text-forest disabled:bg-[#F5F8F4]",
  };
  return <button className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-bold transition disabled:cursor-not-allowed", variants[variant], className)} {...props} />;
}
