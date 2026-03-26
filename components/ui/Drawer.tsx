"use client";

import React, { ReactNode } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBodyScrollLock, useOverlayLayer } from "./overlayLayer";
import {
  CONTROL_INNER_RADIUS_CLASS,
  CONTROL_OVERLAY_CLASS,
  CONTROL_PANEL_CLASS,
  CONTROL_PANEL_RADIUS_CLASS,
} from "./controlStyles";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string | number;
  showCloseButton?: boolean;
  zIndex?: number | string;
  className?: string;
  placement?: "right" | "left";
  noInternalScroll?: boolean;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = 480,
  showCloseButton = true,
  zIndex,
  className = "",
  placement = "right",
  noInternalScroll = false,
}: DrawerProps) {
  const { layerZIndex, bringToFront } = useOverlayLayer(isOpen);
  const overlayZIndex = typeof zIndex === "number" ? zIndex : layerZIndex;
  useBodyScrollLock(isOpen);

  if (typeof document === "undefined") return null;
  const panelWidth = typeof width === "number" ? `${width}px` : width;
  const slideX = placement === "right" ? "100%" : "-100%";
  const roundedClass = placement === "right" ? "rounded-l-3xl" : "rounded-r-3xl";
  const wrapperClass = placement === "right" ? "justify-end" : "justify-start";

  const drawerBody = (
    <motion.div
      initial={{ x: slideX, opacity: 0.85 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: slideX, opacity: 0.85 }}
      transition={{ type: "spring", damping: 26, stiffness: 260 }}
      className={`drawer-content pointer-events-auto relative flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden ${CONTROL_PANEL_RADIUS_CLASS} ${CONTROL_PANEL_CLASS} ${roundedClass} ${className}`}
      style={{
        width: panelWidth,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {(title || showCloseButton) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            {title && <h3 className="truncate pr-4 text-xl font-black tracking-tight text-slate-950">{title}</h3>}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className={`flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 ${CONTROL_INNER_RADIUS_CLASS}`}
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      <div
        className={noInternalScroll ? "flex-1 min-h-0 px-5 py-4" : "flex-1 min-h-0 overflow-y-auto px-5 py-4 hide-scrollbar"}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {children}
      </div>

      {footer && <div className="shrink-0 flex justify-end gap-3 border-t border-slate-200 px-5 py-3">{footer}</div>}
    </motion.div>
  );

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 ${CONTROL_OVERLAY_CLASS}`}
          style={{ zIndex: overlayZIndex }}
          onPointerDownCapture={bringToFront}
          onClick={onClose}
        >
          <div className={`flex h-full w-full ${wrapperClass}`}>
            {drawerBody}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
