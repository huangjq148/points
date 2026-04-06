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
        className={`flex h-10 items-center gap-2 rounded-2xl border border-[color:var(--ui-border)] bg-[var(--ui-surface-1)] px-3 text-sm font-medium text-[var(--ui-text-secondary)] shadow-[var(--ui-shadow-sm)] transition-all duration-200 hover:border-[color:var(--ui-border-strong)] hover:bg-[var(--ui-surface-3)] hover:shadow-[var(--ui-shadow-md)] ${buttonClassName}`}
      >
        <Users size={14} className="text-[var(--ui-text-soft)]" />
        <span className="max-w-[96px] truncate">{displayText}</span>
        <ChevronDown
          size={14}
          className={`text-[var(--ui-text-soft)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && portalReady && dropdownPosition
        ? ReactDOM.createPortal(
            <div
              ref={dropdownRef}
              className={`fixed min-w-[160px] max-h-60 cursor-default overflow-auto rounded-2xl border border-[color:var(--ui-border)] bg-[var(--ui-panel-bg)] shadow-[var(--ui-shadow-md)] ${dropdownClassName}`}
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                zIndex: "var(--z-dropdown)",
              }}
            >
              <button
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--ui-surface-3)] first:rounded-t-2xl ${
                  selectedChildId === null ? "bg-[var(--ui-option-selected-bg)] text-[var(--ui-focus)]" : "text-[var(--ui-text-secondary)]"
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
                  className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--ui-surface-3)] ${
                    selectedChildId === child.id ? "bg-[var(--ui-option-selected-bg)] text-[var(--ui-focus)]" : "text-[var(--ui-text-secondary)]"
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
