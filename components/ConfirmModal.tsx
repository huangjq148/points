"use client";

import React from 'react';
import Button from '@/components/ui/Button';
import { useBodyScrollLock, useOverlayLayer } from '@/components/ui/overlayLayer';
import {
  CONTROL_OVERLAY_CLASS,
  CONTROL_PANEL_CLASS,
  CONTROL_PANEL_RADIUS_CLASS,
} from '@/components/ui/controlStyles';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmText = '确认', cancelText = '取消', type = 'info' 
}) => {
  const { layerZIndex, bringToFront } = useOverlayLayer(isOpen);
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const iconToneClass =
    type === 'danger'
      ? 'bg-[var(--ui-danger-bg)] text-[var(--ui-danger-text)]'
      : type === 'warning'
        ? 'bg-[var(--ui-warning-bg)] text-[var(--ui-warning-text)]'
        : 'bg-[var(--ui-surface-3)] text-[var(--ui-text-secondary)]';

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${CONTROL_OVERLAY_CLASS}`}
      style={{ zIndex: layerZIndex }}
      onPointerDownCapture={bringToFront}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm transform overflow-hidden p-6 transition-all ${CONTROL_PANEL_RADIUS_CLASS} ${CONTROL_PANEL_CLASS}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
           <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${iconToneClass}`}>
             {type === 'danger' ? '⚠️' : 'ℹ️'}
           </div>
           <h3 className="mb-2 text-lg font-black tracking-tight text-[var(--ui-text-primary)]">{title}</h3>
           <p className="mb-6 whitespace-pre-line text-sm leading-6 text-[var(--ui-text-muted)]">{message}</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="error"
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => { onConfirm(); onClose(); }}
            variant={type === 'danger' ? 'error' : 'primary'}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
