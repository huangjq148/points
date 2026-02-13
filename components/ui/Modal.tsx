"use client";

import React, { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import Button from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * 弹窗宽度，可以是 tailwind 类名 (如 'max-w-md') 或数字 (像素值)
   */
  width?: string | number;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = "max-w-md",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isNumericWidth = typeof width === "number";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content flex flex-col ${!isNumericWidth ? width : ""}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: "90vh",
          width: isNumericWidth ? width : undefined,
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <Button
            onClick={onClose}
            variant="secondary"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 border-none bg-transparent shadow-none"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
