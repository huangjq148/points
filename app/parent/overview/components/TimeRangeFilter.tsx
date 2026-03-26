"use client";

import { useState, useEffect, useLayoutEffect, useReducer } from "react";
import ReactDOM from "react-dom";
import { Calendar, ChevronDown } from "lucide-react";

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

export default function TimeRangeFilter({
  value,
  onChange,
  customStartDate,
  customEndDate,
}: TimeRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(value === "custom");
  const [startDate, setStartDate] = useState(customStartDate || "");
  const [endDate, setEndDate] = useState(customEndDate || "");
  const [buttonEl, setButtonEl] = useState<HTMLButtonElement | null>(null);
  const [dropdownEl, setDropdownEl] = useState<HTMLDivElement | null>(null);
  const [, forcePositionUpdate] = useReducer((value: number) => value + 1, 0);

  const selectedLabel = options.find((o) => o.value === value)?.label || "本周";
  const shouldShowDropdown = isOpen || showCustomDate;
  const dropdownPosition = (() => {
    if (!shouldShowDropdown || !buttonEl) {
      return { top: 0, left: 0 };
    }

    const rect = buttonEl.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left,
    };
  })();

  useLayoutEffect(() => {
    if (!shouldShowDropdown) return;

    const updatePosition = () => {
      forcePositionUpdate();
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [shouldShowDropdown]);

  useEffect(() => {
    if (!(isOpen || showCustomDate)) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (buttonEl?.contains(target)) return;
      if (dropdownEl?.contains(target)) return;
      setIsOpen(false);
      setShowCustomDate(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, showCustomDate, buttonEl, dropdownEl]);

  const handleSelect = (range: TimeRange) => {
    if (range === "custom") {
      setShowCustomDate(true);
      setIsOpen(false);
      return;
    }
    setShowCustomDate(false);
    onChange(range);
    setIsOpen(false);
  };

  const handleCustomDateSubmit = () => {
    if (startDate && endDate) {
      onChange("custom", { start: startDate, end: endDate });
      setShowCustomDate(false);
    }
  };

  // 获取默认日期范围
  const getDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const defaultRange = getDefaultDateRange();

  return (
    <div className="relative">
      <button
        ref={setButtonEl}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Calendar size={14} className="text-slate-400" />
        <span>{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen &&
        ReactDOM.createPortal(
          <div
            ref={setDropdownEl}
            className="fixed bg-white border border-slate-200 rounded-2xl shadow-xl z-[100] min-w-[120px] cursor-default"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full cursor-pointer text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl ${
                  value === option.value ? "bg-blue-50 text-blue-600" : "text-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}

      {/* 自定义日期选择器 */}
      {showCustomDate &&
        ReactDOM.createPortal(
          <div
            ref={setDropdownEl}
            className="fixed bg-white border border-slate-200 rounded-2xl shadow-xl z-[100] p-4 w-72 cursor-default"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            <h4 className="text-sm font-semibold text-slate-800 mb-3">选择日期范围</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">开始日期</label>
                <input
                  type="date"
                  value={startDate || defaultRange.start}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">结束日期</label>
                <input
                  type="date"
                  value={endDate || defaultRange.end}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCustomDate(false)}
                  className="flex-1 cursor-pointer px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCustomDateSubmit}
                  className="flex-1 cursor-pointer px-3 py-2 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
