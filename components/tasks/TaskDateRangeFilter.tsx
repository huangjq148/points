"use client";

import { Calendar } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

interface TaskDateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  className?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
}

export default function TaskDateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = "",
  startPlaceholder = "开始日期",
  endPlaceholder = "结束日期",
}: TaskDateRangeFilterProps) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-[18px] border border-slate-200/80 bg-white/95 px-3 py-2 shadow-sm ${className}`}
    >
      <Calendar size={16} className="shrink-0 text-slate-400" />
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
        <DatePicker
          selected={startDate}
          onChange={onStartDateChange}
          placeholderText={startPlaceholder}
          icon={null}
          isClearable={false}
          wrapperClassName="w-full min-w-0"
          className="!h-9 !min-h-9 !w-full !border-0 !bg-transparent !px-2 !shadow-none"
        />
        <DatePicker
          selected={endDate}
          onChange={onEndDateChange}
          placeholderText={endPlaceholder}
          icon={null}
          isClearable={false}
          wrapperClassName="w-full min-w-0"
          className="!h-9 !min-h-9 !w-full !border-0 !bg-transparent !px-2 !shadow-none"
        />
      </div>
    </div>
  );
}
