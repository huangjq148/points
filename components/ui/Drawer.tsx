"use client";

import React, { ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CONTROL_HEIGHT_CLASS,
  CONTROL_INNER_RADIUS_CLASS,
  CONTROL_OVERLAY_CLASS,
  CONTROL_PANEL_CLASS,
  CONTROL_PANEL_RADIUS_CLASS,
} from "./controlStyles";

type DrawerId = symbol;
type DrawerListener = () => void;

const defaultBaseZIndex = 9998;
const drawerOrders = new Map<DrawerId, number>();
let drawerOrderSeed = 0;
const drawerListeners = new Set<DrawerListener>();
const emitStackChange = () => drawerListeners.forEach((listener) => listener());

const drawerStackManager = {
  add(id: DrawerId) {
    drawerOrders.set(id, ++drawerOrderSeed);
    emitStackChange();
  },
  remove(id: DrawerId) {
    if (drawerOrders.delete(id)) {
      emitStackChange();
    }
  },
  subscribe(listener: DrawerListener) {
    drawerListeners.add(listener);
    return () => drawerListeners.delete(listener);
  },
  getOrder(id: DrawerId) {
    return drawerOrders.get(id) ?? -1;
  },
};

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
  zIndex = "var(--z-modal)",
  className = "",
  placement = "right",
  noInternalScroll = false,
}: DrawerProps) {
  const drawerIdRef = useRef<DrawerId>(Symbol("drawer"));
  const stackPosition = useSyncExternalStore(
    drawerStackManager.subscribe,
    () => drawerStackManager.getOrder(drawerIdRef.current),
    () => -1,
  );
  const baseZIndex =
    typeof zIndex === "number"
      ? zIndex
      : typeof document !== "undefined"
        ? (() => {
            const value = getComputedStyle(document.documentElement).getPropertyValue("--z-modal");
            const parsed = parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : defaultBaseZIndex;
          })()
        : defaultBaseZIndex;

  useEffect(() => {
    const id = drawerIdRef.current;
    if (!isOpen) {
      drawerStackManager.remove(id);
      return;
    }
    drawerStackManager.add(id);
    return () => {
      drawerStackManager.remove(id);
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
        <div className="flex items-start justify-between gap-4 border-b border-slate-100/90 px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            {title && <h3 className="truncate pr-4 text-2xl font-black tracking-tight text-slate-900">{title}</h3>}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className={`flex w-11 flex-shrink-0 cursor-pointer items-center justify-center border border-slate-200/80 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 ${CONTROL_HEIGHT_CLASS} ${CONTROL_INNER_RADIUS_CLASS}`}
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      <div
        className={noInternalScroll ? "flex-1 min-h-0 px-6 py-5" : "flex-1 min-h-0 overflow-y-auto px-6 py-5 hide-scrollbar"}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {children}
      </div>

      {footer && <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex justify-end gap-3">{footer}</div>}
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
          onPointerDownCapture={() => drawerStackManager.add(drawerIdRef.current)}
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
