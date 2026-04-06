"use client";

import { ReactNode } from "react";

type TableActionTone = "blue" | "emerald" | "amber" | "rose";

interface TableActionButtonProps {
  icon: ReactNode;
  label: string;
  tone?: TableActionTone;
  onClick: () => void;
}

interface TableActionGroupProps {
  children: ReactNode;
}

const actionButtonBaseClass =
  "flex h-10 w-10 items-center justify-center rounded-2xl border shadow-[var(--ui-shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--ui-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-panel-bg)]";

const actionToneClassMap: Record<TableActionTone, string> = {
  blue: "border-[color:var(--ui-action-blue-border)] bg-[var(--ui-action-blue-bg)] text-[var(--ui-action-blue-text)] hover:border-[color:var(--ui-action-blue-border)] hover:bg-[var(--ui-action-blue-bg-hover)] focus-visible:ring-[var(--ui-focus-ring)]",
  emerald: "border-[color:var(--ui-action-emerald-border)] bg-[var(--ui-action-emerald-bg)] text-[var(--ui-action-emerald-text)] hover:border-[color:var(--ui-action-emerald-border)] hover:bg-[var(--ui-action-emerald-bg-hover)] focus-visible:ring-[var(--ui-focus-ring)]",
  amber: "border-[color:var(--ui-action-amber-border)] bg-[var(--ui-action-amber-bg)] text-[var(--ui-action-amber-text)] hover:border-[color:var(--ui-action-amber-border)] hover:bg-[var(--ui-action-amber-bg-hover)] focus-visible:ring-[var(--ui-focus-ring)]",
  rose: "border-[color:var(--ui-action-rose-border)] bg-[var(--ui-action-rose-bg)] text-[var(--ui-action-rose-text)] hover:border-[color:var(--ui-action-rose-border)] hover:bg-[var(--ui-action-rose-bg-hover)] focus-visible:ring-[var(--ui-focus-ring)]",
};

export function TableActionGroup({ children }: TableActionGroupProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1.5 rounded-[18px] border border-[color:var(--ui-border)] bg-[var(--ui-panel-bg-subtle)] p-1.5 shadow-[var(--ui-shadow-sm)] backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}

export function TableActionButton({
  icon,
  label,
  tone = "blue",
  onClick,
}: TableActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${actionButtonBaseClass} ${actionToneClassMap[tone]}`}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
