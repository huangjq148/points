"use client";

import type { ReactNode } from "react";
import { Gift } from "lucide-react";

export function SectionTitle({
  icon,
  title,
  description,
  titleClassName = "text-white",
  descriptionClassName = "text-sky-100",
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <div className="flex flex-row gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div>
        <div className={`flex gap-2 text-base font-extrabold ${titleClassName}`}>
          {icon}
          {title}
        </div>
        {description && <p className={`mt-1 text-sm text-left ${descriptionClassName}`}>{description}</p>}
      </div>
    </div>
  );
}

export function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon?: ReactNode;
}) {
  return (
    <div className="reward-stat-card rounded-[28px] border border-white/75 bg-white/80 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <span>{title}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children?: ReactNode;
}) {
  return (
    <div className="reward-empty-state rounded-[30px] border border-dashed border-slate-200 bg-white/80 py-16 text-center text-slate-500">
      <Gift size={52} className="mx-auto mb-3 opacity-40" />
      <p className="text-base font-medium text-slate-600">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "emerald" | "amber" | "rose" | "blue" | "time";
}) {
  const toneClass: Record<typeof tone, string> = {
    slate: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70",
    emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    time: "bg-gradient-to-r from-amber-50 to-orange-50 text-orange-700 ring-1 ring-amber-100",
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${toneClass[tone]}`}>{children}</span>;
}

export function RewardCard({
  title,
  icon,
  points,
  stockLabel,
  typeLabel,
  description,
  meta,
  badges,
  tone = "default",
  primaryAction,
  secondaryActions,
  muted = false,
  compact = false,
  tableRow = false,
}: {
  title: string;
  icon: ReactNode;
  points: string | number;
  stockLabel: string;
  typeLabel: string;
  description?: string;
  meta?: ReactNode;
  badges?: ReactNode;
  tone?: "default" | "time";
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  muted?: boolean;
  compact?: boolean;
  tableRow?: boolean;
}) {
  const rowMode = compact || tableRow;
  const descriptionText = description?.trim() || "暂无说明";
  return (
    <div
      className={`reward-card group relative overflow-hidden rounded-[20px] border ${
        tone === "time"
          ? "border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,255,255,0.96)_100%)]"
          : "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)]"
      } ${rowMode ? "p-4" : "p-5"} shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(15,23,42,0.1)] ${muted ? "opacity-65" : ""}`}
    >
      <div className={`pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-full blur-2xl ${tone === "time" ? "bg-amber-100/70" : "bg-sky-100/70"}`} />
      <div className={`relative flex ${rowMode ? "items-start gap-4" : "items-start gap-4"} ${rowMode ? "mb-1" : ""}`}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-[28px] bg-white shadow-[0_10px_20px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-white ${rowMode ? "h-14 w-14 text-[28px]" : "h-16 w-16 text-[34px]"}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className={`${rowMode ? "text-[17px]" : "text-[18px]"} truncate font-bold tracking-tight text-slate-900 leading-none`}>{title}</h3>
              <p className={`${rowMode ? "mt-1 line-clamp-1 text-xs leading-5" : "mt-2 line-clamp-2 text-sm leading-6"} max-w-[34rem] ${description ? "text-slate-600" : "text-slate-400"}`}>
                {descriptionText}
              </p>
            </div>
            <div className="shrink-0 rounded-[20px] bg-slate-50 px-3 py-2 text-right ring-1 ring-slate-200/70">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">积分</div>
              <div className="mt-0.5 text-lg font-black leading-none text-slate-900">{points}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge tone={tone === "time" ? "time" : "blue"}>{typeLabel}</Badge>
              <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${muted ? "bg-slate-100 text-slate-500" : "bg-rose-50 text-rose-600"}`}>{stockLabel}</div>
              {meta}
              {badges}
            </div>
            {(primaryAction || secondaryActions) && (
              <div className="flex w-full shrink-0 items-stretch gap-2">
                {primaryAction}
                {secondaryActions}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
