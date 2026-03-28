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
  "flex h-10 w-10 items-center justify-center rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const actionToneClassMap: Record<TableActionTone, string> = {
  blue: "border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-600 hover:border-blue-300 hover:from-blue-100 hover:to-blue-50 focus-visible:ring-blue-200",
  emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-600 hover:border-emerald-300 hover:from-emerald-100 hover:to-emerald-50 focus-visible:ring-emerald-200",
  amber: "border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-600 hover:border-amber-300 hover:from-amber-100 hover:to-amber-50 focus-visible:ring-amber-200",
  rose: "border-rose-200 bg-gradient-to-br from-rose-50 to-white text-rose-500 hover:border-rose-300 hover:from-rose-100 hover:to-rose-50 focus-visible:ring-rose-200",
};

export function TableActionGroup({ children }: TableActionGroupProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1.5 rounded-[18px] border border-slate-200/80 bg-white/90 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
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
