"use client";

import React, { ReactNode } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";
import { useBodyScrollLock, useOverlayLayer } from "./overlayLayer";
import {
  CONTROL_INNER_RADIUS_CLASS,
  CONTROL_OVERLAY_CLASS,
  CONTROL_PANEL_CLASS,
  CONTROL_PANEL_RADIUS_CLASS,
} from "./controlStyles";

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
  zIndex,
  className = "",
  noInternalScroll = false,
  alert,
}: ModalProps) {
  const { layerZIndex, bringToFront } = useOverlayLayer(isOpen);
  const overlayZIndex = typeof zIndex === "number" ? zIndex : layerZIndex;
  useBodyScrollLock(isOpen);

  if (typeof document === "undefined") return null;

  const alertType = alert?.type ?? "info";
  const alertIcon =
    alertType === "error" ? "❌" : alertType === "success" ? "✅" : "ℹ️";
  const alertColorClass =
    alertType === "error"
      ? "bg-[var(--ui-danger-bg)] text-[var(--ui-danger-text)]"
      : alertType === "success"
      ? "bg-[var(--ui-success-bg)] text-[var(--ui-success-text)]"
      : "bg-[var(--ui-surface-3)] text-[var(--ui-text-secondary)]";

  const modalBody = alert ? (
    <motion.div
      initial={{ scale: 0.8, y: 50, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.8, y: 50, opacity: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className={`w-full max-w-sm transform overflow-hidden p-6 transition-all ${CONTROL_PANEL_RADIUS_CLASS} ${CONTROL_PANEL_CLASS}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-center">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${alertColorClass}`}>
          {alertIcon}
        </div>
        <h3 className="mb-2 text-lg font-black tracking-tight text-[var(--ui-text-primary)]">{title ?? "提示"}</h3>
        <p className="mb-6 whitespace-pre-line text-sm leading-6 text-[var(--ui-text-muted)]">{alert.message}</p>
        {children && <div className="text-left text-sm text-[var(--ui-text-secondary)]">{children}</div>}
      </div>
      <Button onClick={onClose} variant="primary" fullWidth className="mt-2">
        {alert.confirmText ?? "确定"}
      </Button>
    </motion.div>
  ) : (
    <motion.div
      initial={{ scale: 0.8, y: 50, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.8, y: 50, opacity: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className={`w-full overflow-hidden ${CONTROL_PANEL_RADIUS_CLASS} ${CONTROL_PANEL_CLASS} ${className}`}
      style={{
        maxWidth: typeof width === "number" ? width : undefined,
        width: "100%",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {(title || showCloseButton) && (
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--ui-border)] px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            {title && <h3 className="truncate pr-4 text-xl font-black tracking-tight text-[var(--ui-text-primary)]">{title}</h3>}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className={`flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center border border-[color:var(--ui-border)] bg-[var(--ui-surface-2)] text-[var(--ui-text-secondary)] transition-colors hover:bg-[var(--ui-surface-3)] hover:text-[var(--ui-text-primary)] ${CONTROL_INNER_RADIUS_CLASS}`}
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      <div
        className={noInternalScroll ? "px-5 py-4" : "max-h-[60vh] overflow-y-auto px-5 py-4 hide-scrollbar"}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {children}
      </div>

      {footer && <div className="flex justify-end gap-3 border-t border-[color:var(--ui-border)] px-5 py-3">{footer}</div>}
    </motion.div>
  );

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 flex items-center justify-center p-4 ${CONTROL_OVERLAY_CLASS}`}
          style={{ zIndex: overlayZIndex }}
          onPointerDownCapture={bringToFront}
          onClick={onClose}
        >
          {modalBody}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
