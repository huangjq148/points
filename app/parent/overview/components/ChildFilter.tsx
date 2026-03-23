"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import { Users, ChevronDown } from "lucide-react";

interface Child {
  id: string;
  username: string;
  avatar?: string;
}

interface ChildFilterProps {
  childList: Child[];
  selectedChildId: string | null;
  onChange: (childId: string | null) => void;
}

export default function ChildFilter({
  childList,
  selectedChildId,
  onChange,
}: ChildFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isPositionReady, setIsPositionReady] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const selectedChild = childList.find((c) => c.id === selectedChildId);
  const displayText = selectedChild
    ? selectedChild.username
    : "全部孩子";

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
      setIsPositionReady(true);
    };

    setIsPositionReady(false);
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
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Users size={14} className="text-slate-400" />
        <span className="max-w-[80px] truncate">{displayText}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && portalReady && isPositionReady &&
        ReactDOM.createPortal(
          <>
            <div
              ref={dropdownRef}
              className="fixed bg-white border border-slate-200 rounded-2xl shadow-xl z-[100] min-w-[140px] max-h-60 overflow-auto cursor-default"
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
                className={`w-full cursor-pointer text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 first:rounded-t-2xl ${
                  selectedChildId === null ? "bg-blue-50 text-blue-600" : "text-slate-700"
                }`}
              >
                <Users size={14} />
                <span>全部孩子</span>
              </button>
              {childList.map((child, index) => (
                <button
                  key={child.id}
                  onClick={() => {
                    onChange(child.id);
                    setIsOpen(false);
                  }}
                  className={`w-full cursor-pointer text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                    selectedChildId === child.id ? "bg-blue-50 text-blue-600" : "text-slate-700"
                  } ${index === childList.length - 1 ? "rounded-b-2xl" : ""}`}
                >
                  <span className="text-sm">{child.avatar || "👶"}</span>
                  <span className="truncate">{child.username}</span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
