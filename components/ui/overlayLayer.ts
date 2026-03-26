"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const globalOverlayBaseZIndex = 1000;
let globalOverlaySeed = globalOverlayBaseZIndex;

type OverlayId = symbol;

const overlayOrders = new Map<OverlayId, number>();
let bodyLockCount = 0;
let previousBodyOverflow = "";

const nextOverlayZIndex = () => ++globalOverlaySeed;

export const overlayLayerManager = {
  open(id: OverlayId) {
    const zIndex = nextOverlayZIndex();
    overlayOrders.set(id, zIndex);
    return zIndex;
  },
  bringToFront(id: OverlayId) {
    const zIndex = nextOverlayZIndex();
    overlayOrders.set(id, zIndex);
    return zIndex;
  },
  close(id: OverlayId) {
    overlayOrders.delete(id);
  },
  get(id: OverlayId) {
    return overlayOrders.get(id) ?? -1;
  },
};

export function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    if (bodyLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
    }

    bodyLockCount += 1;
    document.body.style.overflow = "hidden";

    return () => {
      bodyLockCount = Math.max(0, bodyLockCount - 1);
      if (bodyLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, [isOpen]);
}

export function useOverlayLayer(isOpen: boolean) {
  const overlayIdRef = useRef<OverlayId>(Symbol("overlay"));
  const [layerZIndex, setLayerZIndex] = useState(0);

  useLayoutEffect(() => {
    const id = overlayIdRef.current;
    if (!isOpen) {
      overlayLayerManager.close(id);
      setLayerZIndex(0);
      return;
    }

    setLayerZIndex(overlayLayerManager.open(id));
    return () => {
      overlayLayerManager.close(id);
    };
  }, [isOpen]);

  const bringToFront = useCallback(() => {
    const nextZIndex = overlayLayerManager.bringToFront(overlayIdRef.current);
    setLayerZIndex(nextZIndex);
  }, []);

  return { layerZIndex, bringToFront };
}
