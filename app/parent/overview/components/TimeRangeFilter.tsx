"use client";

import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { Button, DatePicker, Select } from "@/components/ui";

export type TimeRange = "today" | "week" | "month" | "year" | "custom";

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange, customDates?: { start: string; end: string }) => void;
  customStartDate?: string;
  customEndDate?: string;
}

const options: { value: TimeRange; label: string }[] = [
  { value: "today", label: "今天" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "year", label: "本年" },
  { value: "custom", label: "自定义" },
];

function parseDateInput(value: string) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}

function formatDateInput(date: Date | null) {
  return date ? dayjs(date).format("YYYY-MM-DD") : "";
}

export default function TimeRangeFilter({
  value,
  onChange,
  customStartDate,
  customEndDate,
}: TimeRangeFilterProps) {
  const [showCustomDate, setShowCustomDate] = useState(value === "custom");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  const defaultRange = {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
  const [startDate, setStartDate] = useState(customStartDate || defaultRange.start);
  const [endDate, setEndDate] = useState(customEndDate || defaultRange.end);

  useEffect(() => {
    if (!showCustomDate) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setShowCustomDate(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [showCustomDate]);

  const handleSelect = (range: TimeRange) => {
    if (range === "custom") {
      setStartDate(customStartDate || startDate || defaultRange.start);
      setEndDate(customEndDate || endDate || defaultRange.end);
      setShowCustomDate(true);
      return;
    }
    setShowCustomDate(false);
    onChange(range);
  };

  const handleCustomDateSubmit = () => {
    if (startDate && endDate) {
      onChange("custom", { start: startDate, end: endDate });
      setShowCustomDate(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative min-w-[132px]">
      <Select
        value={value}
        onChange={(nextValue) => {
          if (typeof nextValue === "string") {
            handleSelect(nextValue as TimeRange);
          }
        }}
        options={options}
        placeholder="选择周期"
      />

      {/* 自定义日期选择器 */}
      {showCustomDate && (
        <div
          ref={panelRef}
          className="absolute left-0 top-[calc(100%+8px)] z-[var(--z-dropdown)] w-72 cursor-default rounded-2xl border border-[color:var(--ui-border)] bg-[var(--ui-panel-bg)] p-4 shadow-[var(--ui-shadow-md)] backdrop-blur-md"
        >
          <h4 className="mb-3 text-sm font-semibold text-[var(--ui-text-primary)]">选择日期范围</h4>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--ui-text-muted)]">开始日期</label>
              <DatePicker
                selected={parseDateInput(startDate)}
                onChange={(date: Date | null) => setStartDate(formatDateInput(date))}
                placeholderText="选择开始日期"
                isClearable={false}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--ui-text-muted)]">结束日期</label>
              <DatePicker
                selected={parseDateInput(endDate)}
                onChange={(date: Date | null) => setEndDate(formatDateInput(date))}
                placeholderText="选择结束日期"
                isClearable={false}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setShowCustomDate(false)}
                variant="secondary"
                className="flex-1"
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={handleCustomDateSubmit}
                variant="primary"
                className="flex-1"
              >
                确定
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
