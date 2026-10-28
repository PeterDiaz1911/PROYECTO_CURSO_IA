import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("flex h-10 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-[#526157] focus:border-forest focus:ring-2 focus:ring-forest/15 disabled:cursor-not-allowed disabled:bg-[#F5F8F4] disabled:text-[#526157]", className)} {...props} />; }
