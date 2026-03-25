"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { ChevronDown, Users } from "lucide-react";

export interface ChildFilterOption {
  id: string;
  username: string;
  avatar?: string;
}

interface ChildFilterSelectProps {
  childList: ChildFilterOption[];
  selectedChildId: string | null;
  onChange: (childId: string | null) => void;
  allLabel?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

export default function ChildFilterSelect({
  childList,
  selectedChildId,
  onChange,
  allLabel = "全部孩子",
  className = "",
  buttonClassName = "",
  dropdownClassName = "",
}: ChildFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalReady = typeof document !== "undefined";

  const selectedChild = childList.find((child) => child.id === selectedChildId);
  const displayText = selectedChild ? selectedChild.username : allLabel;

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (buttonRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${buttonClassName}`}
      >
        <Users size={14} className="text-slate-400" />
        <span className="max-w-[96px] truncate">{displayText}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && portalReady && dropdownPosition
        ? ReactDOM.createPortal(
            <div
              ref={dropdownRef}
              className={`fixed z-[100] min-w-[160px] max-h-60 cursor-default overflow-auto rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.12)] ${dropdownClassName}`}
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
              }}
            >
              <button
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 first:rounded-t-2xl ${
                  selectedChildId === null ? "bg-blue-50 text-blue-600" : "text-slate-700"
                }`}
              >
                <Users size={14} />
                <span>{allLabel}</span>
              </button>
              {childList.map((child, index) => (
                <button
                  key={child.id}
                  onClick={() => {
                    onChange(child.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                    selectedChildId === child.id ? "bg-blue-50 text-blue-600" : "text-slate-700"
                  } ${index === childList.length - 1 ? "rounded-b-2xl" : ""}`}
                >
                  <span className="text-sm">{child.avatar || "👶"}</span>
                  <span className="truncate">{child.username}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
