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
  "flex h-8 w-8 items-center justify-center rounded-xl border bg-[var(--ui-surface-1)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-panel-bg)]";

const actionToneClassMap: Record<TableActionTone, string> = {
  blue: "border-[color:var(--ui-border)] text-[var(--ui-text-secondary)] shadow-none hover:border-[color:var(--ui-border-strong)] hover:bg-[var(--ui-surface-2)] hover:text-[var(--ui-text-primary)] hover:shadow-[var(--ui-shadow-sm)] focus-visible:ring-[var(--ui-focus-ring)]",
  emerald: "border-[color:var(--ui-border)] text-[var(--ui-text-secondary)] shadow-none hover:border-[color:var(--ui-border-strong)] hover:bg-[var(--ui-surface-2)] hover:text-[var(--ui-text-primary)] hover:shadow-[var(--ui-shadow-sm)] focus-visible:ring-[var(--ui-focus-ring)]",
  amber: "border-[color:var(--ui-border)] text-[var(--ui-text-secondary)] shadow-none hover:border-[color:var(--ui-border-strong)] hover:bg-[var(--ui-surface-2)] hover:text-[var(--ui-text-primary)] hover:shadow-[var(--ui-shadow-sm)] focus-visible:ring-[var(--ui-focus-ring)]",
  rose: "border-[color:var(--ui-danger-border)] text-[var(--ui-danger-text)] shadow-none hover:border-[color:var(--ui-danger-border-hover)] hover:bg-[var(--ui-danger-bg)] hover:text-[var(--ui-danger-text)] hover:shadow-[var(--ui-shadow-sm)] focus-visible:ring-[var(--ui-focus-ring)]",
};

export function TableActionGroup({ children }: TableActionGroupProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1">
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
