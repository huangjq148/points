"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";

type ModalId = symbol;
type ModalListener = () => void;

const defaultBaseZIndex = 9998;
// Track the z-order of active modals so the most recently opened modal stays on top.
const modalOrders = new Map<ModalId, number>();
let modalOrderSeed = 0;
const modalListeners = new Set<ModalListener>();
const emitStackChange = () => modalListeners.forEach((listener) => listener());

const modalStackManager = {
  add(id: ModalId) {
    modalOrders.set(id, ++modalOrderSeed);
    emitStackChange();
  },
  remove(id: ModalId) {
    if (modalOrders.delete(id)) {
      emitStackChange();
    }
  },
  subscribe(listener: ModalListener) {
    modalListeners.add(listener);
    return () => modalListeners.delete(listener);
  },
  getOrder(id: ModalId) {
    return modalOrders.get(id) ?? -1;
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
      setStackPosition(modalStackManager.getOrder(modalIdRef.current));
    };
    updatePosition();
    const unsubscribe = modalStackManager.subscribe(updatePosition);
    return () => { unsubscribe(); };
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
      className="w-full max-w-sm transform overflow-hidden rounded-[1.85rem] border border-white/70 bg-white/96 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${alertColorClass}`}>
          {alertIcon}
        </div>
        <h3 className="mb-2 text-lg font-black tracking-tight text-slate-900">{title ?? "提示"}</h3>
        <p className="mb-6 whitespace-pre-line text-sm leading-6 text-slate-500">{alert.message}</p>
        {children && <div className="text-left text-sm text-slate-600">{children}</div>}
      </div>
      <Button onClick={onClose} variant="primary" fullWidth className="mt-2 rounded-full">
        {alert.confirmText ?? "确定"}
      </Button>
    </motion.div>
  ) : (
    <motion.div
      initial={{ scale: 0.8, y: 50, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.8, y: 50, opacity: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className={`w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/96 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl ${className}`}
      style={{
        maxWidth: typeof width === "number" ? width : undefined,
        width: "100%",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {(title || showCloseButton) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100/90 px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            {title && <h3 className="truncate pr-4 text-2xl font-black tracking-tight text-slate-900">{title}</h3>}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      <div
        className={noInternalScroll ? "px-6 py-5" : "max-h-[60vh] overflow-y-auto px-6 py-5 hide-scrollbar"}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {children}
      </div>

      {footer && <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">{footer}</div>}
    </motion.div>
  );

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md"
          style={{ zIndex: overlayZIndex }}
          onPointerDownCapture={() => modalStackManager.add(modalIdRef.current)}
          onClick={onClose}
        >
          {modalBody}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
