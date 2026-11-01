import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("flex h-10 w-full rounded-xl border border-default bg-field px-3 text-sm text-primary outline-none transition placeholder:text-secondary focus:border-focus focus:ring-2 focus:ring-focus disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-secondary", className)} {...props} />; }
