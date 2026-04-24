"use client";

import type { CSSProperties, ReactNode } from "react";
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
  className = "",
}: {
  title: string;
  value: string | number;
  hint: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`reward-stat-card rounded-[28px] border border-[color:var(--ui-border)] bg-[linear-gradient(180deg,var(--ui-panel-bg)_0%,var(--ui-panel-bg-subtle)_100%)] p-4 shadow-[var(--ui-shadow-md)] ${className}`}>
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--ui-text-muted)]">
        <span>{title}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-black text-[var(--ui-text-primary)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--ui-text-muted)]">{hint}</div>
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
  variant = "default",
}: {
  children: ReactNode;
  tone?: "slate" | "emerald" | "amber" | "rose" | "blue" | "time";
  variant?: "default" | "child";
}) {
  const toneClass: Record<typeof tone, string> = {
    slate: "border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] text-[var(--ui-text-secondary)]",
    emerald:
      "border border-[color:var(--ui-success-border)] bg-[var(--ui-success-bg)] text-[var(--ui-success-text)]",
    amber:
      "border border-[color:var(--ui-warning-border)] bg-[var(--ui-warning-bg)] text-[var(--ui-warning-text)]",
    rose: "border border-[color:var(--ui-danger-border)] bg-[var(--ui-danger-bg)] text-[var(--ui-danger-text)]",
    blue: "border border-[color:var(--ui-action-blue-border)] bg-[var(--ui-action-blue-bg)] text-[var(--ui-action-blue-text)]",
    time: "border border-[color:var(--ui-action-amber-border)] bg-[var(--ui-action-amber-bg)] text-[var(--ui-action-amber-text)]",
  };

  const childToneStyle: Record<typeof tone, CSSProperties> = {
    slate: {
      background: "var(--child-surface-muted)",
      color: "var(--child-text-muted)",
      boxShadow: "inset 0 0 0 1px var(--child-border)",
    },
    emerald: {
      background: "color-mix(in srgb, var(--child-surface-strong) 72%, #059669 28%)",
      color: "color-mix(in srgb, var(--child-text) 68%, #bbf7d0 32%)",
      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--child-border-strong) 66%, #34d399 34%)",
    },
    amber: {
      background: "color-mix(in srgb, var(--child-surface-strong) 68%, #f59e0b 32%)",
      color: "color-mix(in srgb, var(--child-text) 68%, #fde68a 32%)",
      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--child-border-strong) 54%, #fbbf24 46%)",
    },
    rose: {
      background: "color-mix(in srgb, var(--child-surface-strong) 68%, #e11d48 32%)",
      color: "color-mix(in srgb, var(--child-text) 68%, #fecdd3 32%)",
      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--child-border-strong) 54%, #fb7185 46%)",
    },
    blue: {
      background: "color-mix(in srgb, var(--child-surface-strong) 68%, #0ea5e9 32%)",
      color: "color-mix(in srgb, var(--child-text) 70%, #bfdbfe 30%)",
      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--child-border-strong) 58%, #60a5fa 42%)",
    },
    time: {
      background:
        "linear-gradient(135deg, color-mix(in srgb, var(--child-surface-strong) 64%, #f59e0b 36%) 0%, color-mix(in srgb, var(--child-surface-muted) 58%, #f97316 42%) 100%)",
      color: "color-mix(in srgb, var(--child-text) 68%, #fde68a 32%)",
      boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--child-border-strong) 52%, #fbbf24 48%)",
    },
  };

  return (
    <span
      className={`reward-badge reward-badge-${tone} rounded-full px-2.5 py-1 text-xs font-bold ${variant === "default" ? toneClass[tone] : ""}`}
      style={variant === "child" ? childToneStyle[tone] : undefined}
    >
      {children}
    </span>
  );
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
  themeVariant = "default",
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
  themeVariant?: "default" | "child";
}) {
  const rowMode = compact || tableRow;
  const descriptionText = description?.trim() || "暂无说明";
  const childVariant = themeVariant === "child";
  const cardStyle = childVariant
    ? {
        background:
          tone === "time"
            ? "linear-gradient(180deg, color-mix(in srgb, var(--child-surface-strong) 84%, #f59e0b 16%) 0%, color-mix(in srgb, var(--child-surface) 84%, #f97316 16%) 100%)"
            : "linear-gradient(180deg, var(--child-surface-strong) 0%, var(--child-surface) 100%)",
        borderColor:
          tone === "time"
            ? "color-mix(in srgb, var(--child-border-strong) 58%, #fbbf24 42%)"
            : "var(--child-border)",
        boxShadow: "var(--child-shadow-card)",
      }
    : undefined;
  const glowStyle = childVariant
    ? {
        backgroundColor:
          tone === "time"
            ? "color-mix(in srgb, transparent 76%, #fbbf24 24%)"
            : "color-mix(in srgb, transparent 78%, var(--child-primary) 22%)",
      }
    : undefined;
  const iconStyle = childVariant
    ? {
        background: "var(--child-surface-strong)",
        border: "1px solid var(--child-border)",
        boxShadow: "var(--child-shadow-card)",
      }
    : undefined;
  const pointsStyle = childVariant
    ? {
        background: "var(--child-surface-muted)",
        border: "1px solid var(--child-border)",
      }
    : undefined;
  const pointsLabelStyle = childVariant
    ? {
        color: "color-mix(in srgb, var(--child-text-muted) 52%, var(--child-primary) 48%)",
      }
    : undefined;
  const pointsValueStyle = childVariant ? { color: "var(--child-text)" } : undefined;
  const stockStyle = childVariant
    ? muted
      ? {
          background: "color-mix(in srgb, var(--child-surface-muted) 92%, var(--child-text-muted) 8%)",
          color: "color-mix(in srgb, var(--child-text-muted) 78%, var(--child-primary) 22%)",
          boxShadow: "inset 0 0 0 1px var(--child-border)",
        }
      : {
          background: "color-mix(in srgb, var(--child-surface-strong) 84%, var(--child-primary) 16%)",
          color: "color-mix(in srgb, var(--child-text-muted) 70%, var(--child-primary-strong) 30%)",
          boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--child-border-strong) 68%, var(--child-primary) 32%)",
        }
    : undefined;
  return (
    <div
      className={`reward-card group relative overflow-hidden rounded-[20px] border ${
        childVariant
          ? tone === "time"
            ? "reward-card-time"
            : "reward-card-default"
          : tone === "time"
            ? "reward-card-time border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,255,255,0.96)_100%)]"
            : "reward-card-default border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)]"
      } ${rowMode ? "p-4" : "p-5"} ${childVariant ? "" : "shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_32px_rgba(15,23,42,0.1)]"} transition duration-300 hover:-translate-y-1 ${muted ? "opacity-65" : ""}`}
      style={cardStyle}
    >
      <div
        className={`reward-card-glow pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-full blur-2xl ${childVariant ? "" : tone === "time" ? "bg-amber-100/70" : "bg-sky-100/70"}`}
        style={glowStyle}
      />
      <div className={`relative flex ${rowMode ? "items-start gap-4" : "items-start gap-4"} ${rowMode ? "mb-1" : ""}`}>
        <div
          className={`reward-card-icon-surface flex shrink-0 items-center justify-center rounded-[28px] ${childVariant ? "" : "bg-white shadow-[0_10px_20px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-white"} ${rowMode ? "h-14 w-14 text-[28px]" : "h-16 w-16 text-[34px]"}`}
          style={iconStyle}
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
            <div
              className={`reward-card-points shrink-0 rounded-[20px] px-3 py-2 text-right ${childVariant ? "" : "bg-slate-50 ring-1 ring-slate-200/70"}`}
              style={pointsStyle}
            >
              <div className="reward-card-points-label text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400" style={pointsLabelStyle}>
                积分
              </div>
              <div className="reward-card-points-value mt-0.5 text-lg font-black leading-none text-slate-900" style={pointsValueStyle}>
                {points}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge tone={tone === "time" ? "time" : "blue"} variant={childVariant ? "child" : "default"}>
                {typeLabel}
              </Badge>
              <div
                className={`reward-card-stock rounded-full px-2.5 py-1 text-xs font-semibold ${
                  muted
                    ? childVariant
                      ? "reward-card-stock-muted"
                      : "reward-card-stock-muted bg-slate-100 text-slate-500"
                    : childVariant
                      ? "reward-card-stock-live"
                      : "reward-card-stock-live bg-rose-50 text-rose-600"
                }`}
                style={stockStyle}
              >
                {stockLabel}
              </div>
              {badges}
            </div>

            {(meta || secondaryActions) && (
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {meta}
                </div>
                {secondaryActions && <div className="flex shrink-0 items-center gap-2">{secondaryActions}</div>}
              </div>
            )}

            {primaryAction && <div className="w-full">{primaryAction}</div>}
          </div>
        </div>
      </div>

    </div>
  );
}
