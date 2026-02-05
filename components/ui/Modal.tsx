"use client";

import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export default function Modal({ isOpen, onClose, title, children, footer, width = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content flex flex-col ${width}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
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
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
