"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** 是否启用点击放大功能 */
  enableZoom?: boolean;
  /** 放大时的提示文字 */
  zoomHint?: string;
  /** 自定义容器类名 */
  containerClassName?: string;
  /** 自定义放大遮罩层类名 */
  overlayClassName?: string;
  /** 放大时的背景透明度 */
  overlayOpacity?: number;
  /** 点击放大时的回调 */
  onZoomOpen?: () => void;
  /** 关闭放大时的回调 */
  onZoomClose?: () => void;
}

export default function Image({
  src,
  alt = "",
  enableZoom = true,
  zoomHint = "点击查看大图",
  containerClassName = "",
  overlayClassName = "",
  overlayOpacity = 0.95,
  onZoomOpen,
  onZoomClose,
  className = "",
  onClick,
  ...rest
}: ImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [transformOrigin, setTransformOrigin] = useState("center center");
  const zoomImageRef = useRef<HTMLImageElement | null>(null);

  const handleOpenZoom = useCallback(() => {
    if (!enableZoom || !src) return;
    setIsZoomed(true);
    setZoomScale(1);
    setTransformOrigin("center center");
    onZoomOpen?.();
    document.body.style.overflow = "hidden";
  }, [enableZoom, src, onZoomOpen]);

  const handleCloseZoom = useCallback(() => {
    setIsZoomed(false);
    setZoomScale(1);
    setTransformOrigin("center center");
    onZoomClose?.();
    document.body.style.overflow = "unset";
  }, [onZoomClose]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleWheelZoom = useCallback(
    (e: React.WheelEvent<HTMLElement>) => {
      if (!isZoomed) return;
      e.preventDefault();
      e.stopPropagation();

      const direction = e.deltaY > 0 ? -1 : 1;
      const nextScale = Math.min(4, Math.max(0.5, zoomScale + direction * 0.15));
      setZoomScale(nextScale);

      const rect = zoomImageRef.current?.getBoundingClientRect();
      if (rect) {
        const originX = ((e.clientX - rect.left) / rect.width) * 100;
        const originY = ((e.clientY - rect.top) / rect.height) * 100;
        setTransformOrigin(`${originX}% ${originY}%`);
      }
    },
    [isZoomed, zoomScale]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      onClick?.(e);
      handleOpenZoom();
    },
    [onClick, handleOpenZoom]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseZoom();
      }
    },
    [handleCloseZoom]
  );

  const zoomLayer =
    typeof document !== "undefined" ? (
      ReactDOM.createPortal(
        <AnimatePresence>
          {isZoomed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`fixed inset-0 flex items-center justify-center ${overlayClassName}`}
              style={{
                backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
                zIndex: "var(--z-image-viewer)",
              }}
              onClick={handleCloseZoom}
              onWheelCapture={handleWheelZoom}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="dialog"
              aria-modal="true"
            >
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: 0.1 }}
                className="absolute top-4 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseZoom();
                }}
                aria-label="关闭"
              >
                <X size={24} />
              </motion.button>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-1/2 top-4 -translate-x-1/2 text-sm font-medium text-white/70"
              >
                点击任意处关闭
              </motion.div>

              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: zoomScale, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                src={src}
                alt={alt}
                ref={zoomImageRef}
                className="max-h-[90vh] max-w-[90vw] cursor-grab active:cursor-grabbing rounded-lg object-contain shadow-2xl"
                style={{ transformOrigin }}
                drag
                dragMomentum={false}
                dragElastic={0.12}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )
    ) : null;

  return (
    <>
      <div
        className={`relative inline-block ${enableZoom ? "cursor-zoom-in" : ""} ${containerClassName}`}
        onClick={enableZoom ? handleOpenZoom : undefined}
      >
        <img
          src={src}
          alt={alt}
          className={`${enableZoom ? "cursor-pointer" : ""} ${className}`}
          onClick={handleClick}
          {...rest}
        />

        {enableZoom && zoomHint && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 hover:bg-black/20 hover:opacity-100">
            <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <ZoomIn size={14} />
              <span>{zoomHint}</span>
            </div>
          </div>
        )}
      </div>

      {zoomLayer}
    </>
  );
}
