"use client";

import type { ReactNode } from "react";
import { Gift } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ChildTone = "sky" | "teal" | "amber" | "rose" | "emerald" | "slate" | "violet";

const toneClassMap: Record<ChildTone, string> = {
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200/70",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
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
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-xl shadow-sm ring-1 ring-white">
              {icon}
            </span>
          )}
          <h1 className="text-2xl font-black tracking-tight text-[var(--child-text)] md:text-3xl">{title}</h1>
        </div>
        {description && <p className="mt-1 text-sm font-semibold text-[var(--child-text-muted)]">{description}</p>}
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
        if (event.key === "Enter" || event.key === " ") onClick();
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
    <div className="rounded-[28px] border border-dashed border-[var(--child-border-strong)] bg-white/70 px-6 py-12 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[24px] bg-sky-50 text-3xl text-sky-500 ring-1 ring-sky-100">
        {icon ?? <Gift size={34} />}
      </div>
      <p className="text-base font-black text-[var(--child-text)]">{title}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--child-text-muted)]">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
