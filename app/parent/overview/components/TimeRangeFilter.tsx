"use client";

import { useState, useRef, useEffect } from "react";
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || "本周";

  useEffect(() => {
    if ((isOpen || showCustomDate) && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen, showCustomDate]);

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
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Calendar size={14} className="text-gray-400" />
        <span>{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {(isOpen || showCustomDate) && (
        <div
          className="fixed inset-0 z-[90]"
          onClick={() => {
            setIsOpen(false);
            setShowCustomDate(false);
          }}
        />
      )}

      {isOpen && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[100] min-w-[120px]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                value === option.value ? "bg-blue-50 text-blue-600" : "text-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* 自定义日期选择器 */}
      {showCustomDate && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[100] p-4 w-72"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          <h4 className="text-sm font-semibold text-gray-800 mb-3">选择日期范围</h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">开始日期</label>
              <input
                type="date"
                value={startDate || defaultRange.start}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">结束日期</label>
              <input
                type="date"
                value={endDate || defaultRange.end}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCustomDate(false)}
                className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCustomDateSubmit}
                className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
