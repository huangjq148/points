"use client";

import type { ReactNode } from "react";
import { Gift } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ChildTone = "sky" | "teal" | "amber" | "rose" | "emerald" | "slate" | "violet";

const toneClassMap: Record<ChildTone, string> = {
  sky: "bg-[color:rgba(14,165,233,0.14)] text-sky-700 ring-[color:rgba(125,211,252,0.24)]",
  teal: "bg-[color:rgba(20,184,166,0.14)] text-teal-700 ring-[color:rgba(94,234,212,0.24)]",
  amber: "bg-[color:rgba(245,158,11,0.16)] text-amber-700 ring-[color:rgba(252,211,77,0.24)]",
  rose: "bg-[color:rgba(244,63,94,0.14)] text-rose-700 ring-[color:rgba(253,164,175,0.24)]",
  emerald: "bg-[color:rgba(16,185,129,0.14)] text-emerald-700 ring-[color:rgba(110,231,183,0.24)]",
  slate: "bg-[var(--child-surface-muted)] text-[var(--child-text-muted)] ring-[color:var(--child-border)]",
  violet: "bg-[color:rgba(139,92,246,0.14)] text-violet-700 ring-[color:rgba(196,181,253,0.24)]",
};

const dotClassMap: Record<ChildTone, string> = {
  sky: "bg-sky-500",
  teal: "bg-teal-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  slate: "bg-slate-500",
  violet: "bg-violet-500",
};

export function ChildPageTitle({
  icon,
  title,
  description,
  action,
  className = "",
  level = "page",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  level?: "page" | "section";
}) {
  const isSection = level === "section";

  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon && (
            <span
              className={cx(
                "flex items-center justify-center rounded-2xl bg-[var(--child-surface-muted)] shadow-sm ring-1 ring-[color:var(--child-border)]",
                isSection ? "h-9 w-9 text-lg" : "h-10 w-10 text-xl",
              )}
            >
              {icon}
            </span>
          )}
          {isSection ? (
            <h2 className="child-heading-section">{title}</h2>
          ) : (
            <h1 className="child-heading-page">{title}</h1>
          )}
        </div>
        {description && <p className={cx("mt-1 child-copy-muted", isSection && "max-w-[42rem]")}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ChildPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cx("child-panel", className)}>{children}</section>;
}

export function ChildCard({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === " ") {
          event.preventDefault();
          return;
        }
        if (event.key === "Enter" && !event.repeat) {
          event.preventDefault();
          onClick();
        }
      }}
      onKeyUp={(event) => {
        if (!onClick) return;
        if (event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cx(
        "child-card transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(14,116,144,0.14)]",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ChildStatCard({
  label,
  value,
  hint,
  icon,
  tone = "sky",
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: ChildTone;
  onClick?: () => void;
}) {
  return (
    <ChildCard onClick={onClick} className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className={`rounded-2xl px-2.5 py-1 text-xs font-black ring-1 ${toneClassMap[tone]}`}>{label}</div>
        {icon && <div className="text-[var(--child-text-muted)]">{icon}</div>}
      </div>
      <div className="mt-3 text-3xl font-black text-[var(--child-text)]">{value}</div>
      {hint && <div className="mt-1 text-xs font-semibold text-[var(--child-text-muted)]">{hint}</div>}
    </ChildCard>
  );
}

export function ChildStatusPill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: ChildTone;
}) {
  return (
    <span className={`child-status-pill ring-1 ${toneClassMap[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClassMap[tone]}`} />
      {children}
    </span>
  );
}

export function ChildEmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--child-border-strong)] bg-[var(--child-surface-muted)] px-6 py-12 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[color:rgba(14,165,233,0.14)] text-3xl text-sky-500 ring-1 ring-[color:rgba(125,211,252,0.24)]">
        {icon ?? <Gift size={34} />}
      </div>
      <p className="text-base font-black text-[var(--child-text)]">{title}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--child-text-muted)]">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
