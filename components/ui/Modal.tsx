"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";

type ModalId = symbol;
type ModalListener = () => void;

const defaultBaseZIndex = 9998;
// Track the z-order of active modals so subsequent overlays render above older ones.
const modalStack: ModalId[] = [];
const modalListeners = new Set<ModalListener>();
const emitStackChange = () => modalListeners.forEach((listener) => listener());

const modalStackManager = {
  add(id: ModalId) {
    if (!modalStack.includes(id)) {
      modalStack.push(id);
      emitStackChange();
    }
  },
  remove(id: ModalId) {
    const index = modalStack.indexOf(id);
    if (index !== -1) {
      modalStack.splice(index, 1);
      emitStackChange();
    }
  },
  subscribe(listener: ModalListener) {
    modalListeners.add(listener);
    return () => modalListeners.delete(listener);
  },
};

type AlertType = "success" | "error" | "info";

interface AlertConfig {
  message: string;
  type?: AlertType;
  confirmText?: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string | number;
  showCloseButton?: boolean;
  zIndex?: number | string;
  className?: string;
  /** 禁用 Modal 内部滚动，由内容自己控制 */
  noInternalScroll?: boolean;
  /** Alert layout that overrides the default header/children/footers. */
  alert?: AlertConfig;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = 600,
  showCloseButton = true,
  zIndex = "var(--z-modal)",
  className = "",
  noInternalScroll = false,
  alert,
}: ModalProps) {
  const modalIdRef = useRef<ModalId>(Symbol("modal"));
  const [stackPosition, setStackPosition] = useState(-1);
  const [baseZIndex, setBaseZIndex] = useState(() =>
    typeof zIndex === "number" ? zIndex : defaultBaseZIndex,
  );

  useEffect(() => {
    const updatePosition = () => {
      setStackPosition(modalStack.indexOf(modalIdRef.current));
    };
    updatePosition();
    return modalStackManager.subscribe(updatePosition);
  }, []);

  useEffect(() => {
    if (typeof zIndex === "number") {
      setBaseZIndex(zIndex);
      return;
    }
    if (typeof document !== "undefined") {
      const value = getComputedStyle(document.documentElement).getPropertyValue("--z-modal");
      const parsed = parseInt(value, 10);
      setBaseZIndex(Number.isFinite(parsed) ? parsed : defaultBaseZIndex);
    }
  }, [zIndex]);

  useEffect(() => {
    const id = modalIdRef.current;
    if (!isOpen) {
      modalStackManager.remove(id);
      return;
    }
    modalStackManager.add(id);
    return () => {
      modalStackManager.remove(id);
    };
  }, [isOpen]);

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

  if (typeof document === "undefined") return null;

  const overlayZIndex = baseZIndex + Math.max(stackPosition, 0);

  const alertType = alert?.type ?? "info";
  const alertIcon =
    alertType === "error" ? "❌" : alertType === "success" ? "✅" : "ℹ️";
  const alertColorClass =
    alertType === "error"
      ? "bg-red-100 text-red-600"
      : alertType === "success"
      ? "bg-green-100 text-green-600"
      : "bg-blue-100 text-blue-600";

  const modalBody = alert ? (
    <motion.div
      initial={{ scale: 0.8, y: 50, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.8, y: 50, opacity: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${alertColorClass}`}>
          {alertIcon}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title ?? "提示"}</h3>
        <p className="text-sm text-gray-500 mb-6 whitespace-pre-line">{alert.message}</p>
        {children && <div className="text-left text-sm text-gray-600">{children}</div>}
      </div>
      <Button onClick={onClose} variant="primary" fullWidth>
        {alert.confirmText ?? "确定"}
      </Button>
    </motion.div>
  ) : (
    <motion.div
      initial={{ scale: 0.8, y: 50, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.8, y: 50, opacity: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className={`bg-white rounded-[2.5rem] p-8 shadow-2xl ${className}`}
      style={{
        maxWidth: typeof width === "number" ? width : undefined,
        width: "100%",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {(title || showCloseButton) && (
        <div className="flex justify-between items-start mb-6">
          {title && <h3 className="text-2xl font-black text-gray-800 pr-4">{title}</h3>}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      <div
        className={noInternalScroll ? "" : "max-h-[60vh] overflow-y-auto hide-scrollbar pr-2"}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {children}
      </div>

      {footer && <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end gap-3">{footer}</div>}
    </motion.div>
  );

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          style={{ zIndex: overlayZIndex }}
          onClick={onClose}
        >
          {modalBody}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
