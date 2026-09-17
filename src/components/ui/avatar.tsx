import type { HTMLAttributes, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-forest text-xs font-bold text-white", className)} {...props} />; }
// eslint-disable-next-line @next/next/no-img-element
export function AvatarImage({ className, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) { return <img className={cn("h-full w-full object-cover", className)} alt={alt} {...props} />; }
export function AvatarFallback({ className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span className={cn("text-xs font-bold", className)} {...props} />; }
