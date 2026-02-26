"use client";

import React, { useState, useCallback } from "react";
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

  const handleOpenZoom = useCallback(() => {
    if (!enableZoom || !src) return;
    setIsZoomed(true);
    onZoomOpen?.();
    document.body.style.overflow = "hidden";
  }, [enableZoom, src, onZoomOpen]);

  const handleCloseZoom = useCallback(() => {
    setIsZoomed(false);
    onZoomClose?.();
    document.body.style.overflow = "unset";
  }, [onZoomClose]);

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

  return (
    <>
      {/* 图片容器 */}
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

        {/* 悬停提示 */}
        {enableZoom && zoomHint && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all duration-300 opacity-0 hover:opacity-100 pointer-events-none">
            <div className="flex items-center gap-1.5 text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <ZoomIn size={14} />
              <span>{zoomHint}</span>
            </div>
          </div>
        )}
      </div>

      {/* 全屏放大视图 */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 z-[9999] flex items-center justify-center ${overlayClassName}`}
            style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
            onClick={handleCloseZoom}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="dialog"
            aria-modal="true"
          >
            {/* 关闭按钮 */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: 0.1 }}
              className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseZoom();
              }}
              aria-label="关闭"
            >
              <X size={24} />
            </motion.button>

            {/* 提示文字 */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium"
            >
              点击任意处关闭
            </motion.div>

            {/* 放大的图片 */}
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-zoom-out"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
