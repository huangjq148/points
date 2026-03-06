"use client";

import { useState, useRef, useEffect } from "react";
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
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedChild = childList.find((c) => c.id === selectedChildId);
  const displayText = selectedChild
    ? selectedChild.username
    : "全部孩子";

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Users size={14} className="text-gray-400" />
        <span className="max-w-[80px] truncate">{displayText}</span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[90]" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[100] min-w-[140px] max-h-60 overflow-auto"
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
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 first:rounded-t-lg ${
                selectedChildId === null ? "bg-blue-50 text-blue-600" : "text-gray-700"
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
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                  selectedChildId === child.id ? "bg-blue-50 text-blue-600" : "text-gray-700"
                } ${index === childList.length - 1 ? "rounded-b-lg" : ""}`}
              >
                <span className="text-sm">{child.avatar || "👶"}</span>
                <span className="truncate">{child.username}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
