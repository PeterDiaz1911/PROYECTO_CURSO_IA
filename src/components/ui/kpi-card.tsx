"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

export type KpiTone = "emerald" | "amber" | "rose" | "sky" | "neutral";

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description: string;
  trend?: string;
  tone?: KpiTone;
  icon: LucideIcon;
  showSparkline?: boolean;
}

const toneConfig: Record<
  KpiTone,
  {
    accent: string;
    badgeBg: string;
    badgeText: string;
    valueClass: string;
    pillClass: string;
  }
> = {
  emerald: {
    accent: "#10b981",
    badgeBg: "#1B4332",
    badgeText: "#ffffff",
    valueClass: "text-[#1B4332] dark:text-emerald-400 [[data-theme=dark]_&]:text-emerald-400",
    pillClass: "bg-emerald-500/15 text-[#1B4332] dark:text-emerald-300 [[data-theme=dark]_&]:text-emerald-300",
  },
  amber: {
    accent: "#f59e0b",
    badgeBg: "#d97706",
    badgeText: "#ffffff",
    valueClass: "text-amber-700 dark:text-amber-400 [[data-theme=dark]_&]:text-amber-400",
    pillClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 [[data-theme=dark]_&]:text-amber-300",
  },
  rose: {
    accent: "#f43f5e",
    badgeBg: "#e11d48",
    badgeText: "#ffffff",
    valueClass: "text-rose-700 dark:text-rose-400 [[data-theme=dark]_&]:text-rose-400",
    pillClass: "bg-rose-500/15 text-rose-800 dark:text-rose-300 [[data-theme=dark]_&]:text-rose-300",
  },
  sky: {
    accent: "#0ea5e9",
    badgeBg: "#0284c7",
    badgeText: "#ffffff",
    valueClass: "text-sky-700 dark:text-sky-400 [[data-theme=dark]_&]:text-sky-400",
    pillClass: "bg-sky-500/15 text-sky-800 dark:text-sky-300 [[data-theme=dark]_&]:text-sky-300",
  },
  neutral: {
    accent: "#526157",
    badgeBg: "#2D6A4F",
    badgeText: "#ffffff",
    valueClass: "text-[var(--text-primary)]",
    pillClass: "bg-emerald-500/10 text-[var(--text-secondary)]",
  },
};

export function KpiCard({
  title,
  value,
  unit,
  description,
  trend,
  tone = "neutral",
  icon: Icon,
  showSparkline = true,
}: KpiCardProps) {
  const s = toneConfig[tone];

  return (
    <div
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, ${s.accent} 11%, var(--surface, #ffffff)) 0%, var(--surface, #ffffff) 58%)`,
        borderColor: `color-mix(in srgb, ${s.accent} 24%, var(--border, rgba(23,37,29,0.12)))`,
      }}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold leading-snug text-[var(--text-primary)]">{title}</span>
        <span
          style={{ backgroundColor: s.badgeBg, color: s.badgeText }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105"
        >
          <Icon size={17} />
        </span>
      </div>

      {/* Valor principal */}
      <div className="my-3 flex items-baseline gap-1.5">
        <span className={`text-3xl font-extrabold tracking-tight ${s.valueClass}`}>{value}</span>
        {unit && <span className="text-xs font-semibold text-[var(--text-secondary)]">{unit}</span>}
      </div>

      {/* Descripción y pie */}
      <div className="space-y-2.5">
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{description}</p>

        {(trend || showSparkline) && (
          <div className="flex items-center justify-between gap-2 pt-1">
            {trend ? (
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${s.pillClass}`}>
                {trend}
              </span>
            ) : (
              <span />
            )}

            {showSparkline && (
              <svg
                viewBox="0 0 80 20"
                className="h-4 w-16 shrink-0 overflow-visible opacity-80 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              >
                <path
                  d={
                    tone === "rose"
                      ? "M2 6 C 18 5, 25 14, 42 12 C 58 10, 66 17, 78 15"
                      : "M2 15 C 16 14, 26 7, 42 9 C 56 11, 66 4, 78 3"
                  }
                  fill="none"
                  stroke={s.accent}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
}